import type { HydratedDocument } from "mongoose";
import { Member } from "../../database/models/Member";
import { MarketListing, type MarketListingDocument } from "../../database/models/MarketListing";
import { ShopItem } from "../../database/models/ShopItem";
import { GuildConfig } from "../../database/models/GuildConfig";
import { getOrCreateMember } from "../profile/profileService";
import { adjustWallet } from "./economyService";

export interface MarketResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

/** Ambil `qty` item dari inventory member secara atomik (aman dari race). */
async function takeInventoryItem(
  guildId: string,
  userId: string,
  itemKey: string,
  qty: number,
): Promise<boolean> {
  const updated = await Member.findOneAndUpdate(
    { guildId, userId, inventory: { $elemMatch: { itemKey, quantity: { $gte: qty } } } },
    { $inc: { "inventory.$.quantity": -qty } },
    { new: true },
  );
  return Boolean(updated);
}

/** Tambah `qty` item ke inventory member (buat entri baru bila belum ada). */
async function giveInventoryItem(
  guildId: string,
  userId: string,
  itemKey: string,
  qty: number,
): Promise<void> {
  await getOrCreateMember(guildId, userId);
  const incremented = await Member.updateOne(
    { guildId, userId, "inventory.itemKey": itemKey },
    { $inc: { "inventory.$.quantity": qty } },
  );
  if (incremented.matchedCount === 0) {
    await Member.updateOne(
      { guildId, userId },
      { $push: { inventory: { itemKey, quantity: qty, acquiredAt: new Date() } } },
    );
  }
}

async function nextListingNumber(guildId: string): Promise<number> {
  const config = await GuildConfig.findOneAndUpdate(
    { guildId },
    { $inc: { "pasar.nextListingNumber": 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return (config.pasar?.nextListingNumber ?? 2) - 1;
}

/** Buat listing: tarik item dari inventory penjual (escrow). */
export async function createListing(
  guildId: string,
  sellerId: string,
  itemKey: string,
  pricePerUnit: number,
  quantity: number,
): Promise<MarketResult<HydratedDocument<MarketListingDocument>>> {
  if (!Number.isInteger(pricePerUnit) || pricePerUnit < 1)
    return { ok: false, error: "Harga per unit minimal 1." };
  if (!Number.isInteger(quantity) || quantity < 1) return { ok: false, error: "Jumlah minimal 1." };

  const member = await getOrCreateMember(guildId, sellerId);
  const owned = member.inventory.find((entry) => entry.itemKey === itemKey);
  if (!owned || owned.quantity < quantity) {
    const list =
      member.inventory
        .filter((e) => e.quantity > 0)
        .map((e) => `\`${e.itemKey}\` ×${e.quantity}`)
        .join(", ") || "(kosong)";
    return {
      ok: false,
      error: `Kamu tidak punya cukup item \`${itemKey}\`. Inventory-mu: ${list}.`,
    };
  }

  const taken = await takeInventoryItem(guildId, sellerId, itemKey, quantity);
  if (!taken) return { ok: false, error: "Gagal mengunci item (stok berubah). Coba lagi." };

  const shopItem = await ShopItem.findOne({ guildId, itemKey });
  const itemName = shopItem?.name ?? itemKey;
  const listingNumber = await nextListingNumber(guildId);

  const listing = await MarketListing.create({
    guildId,
    listingNumber,
    sellerId,
    itemKey,
    itemName,
    pricePerUnit,
    quantity,
  });
  return { ok: true, data: listing };
}

export function listActiveListings(guildId: string, limit = 15) {
  return MarketListing.find({ guildId, active: true, quantity: { $gt: 0 } })
    .sort({ createdAt: -1 })
    .limit(limit);
}

export function getListing(guildId: string, listingNumber: number) {
  return MarketListing.findOne({ guildId, listingNumber });
}

export function myListings(guildId: string, sellerId: string) {
  return MarketListing.find({ guildId, sellerId, active: true }).sort({ createdAt: -1 });
}

export interface BuyOutcome {
  itemName: string;
  qty: number;
  totalPaid: number;
  sellerReceived: number;
  sellerId: string;
}

/** Beli sebagian/seluruh listing dengan escrow: bayar penjual, terima item. */
export async function buyListing(
  guildId: string,
  buyerId: string,
  listingNumber: number,
  qty: number,
): Promise<MarketResult<BuyOutcome>> {
  if (!Number.isInteger(qty) || qty < 1) return { ok: false, error: "Jumlah minimal 1." };

  const listing = await MarketListing.findOne({ guildId, listingNumber, active: true });
  if (!listing || listing.quantity <= 0)
    return { ok: false, error: "Listing tidak ditemukan atau sudah habis." };
  if (listing.sellerId === buyerId)
    return {
      ok: false,
      error: "Kamu tidak bisa membeli listing sendiri (batalkan dengan `/pasar batal`).",
    };
  if (qty > listing.quantity) return { ok: false, error: `Stok listing cuma ${listing.quantity}.` };

  const totalPaid = listing.pricePerUnit * qty;

  // Kurangi stok listing dulu secara atomik agar tidak overselling.
  const reserved = await MarketListing.findOneAndUpdate(
    { _id: listing._id, active: true, quantity: { $gte: qty } },
    { $inc: { quantity: -qty } },
    { new: true },
  );
  if (!reserved) return { ok: false, error: "Stok berubah, coba lagi." };

  // Tarik pembayaran dari pembeli; kalau gagal, kembalikan stok listing.
  const debit = await adjustWallet(guildId, buyerId, -totalPaid);
  if (!debit.success) {
    await MarketListing.updateOne({ _id: listing._id }, { $inc: { quantity: qty } });
    return { ok: false, error: "Saldo wallet-mu tidak cukup." };
  }

  // Bayar penjual (dipotong pajak) & serahkan item ke pembeli.
  const config = await GuildConfig.findOne({ guildId });
  const taxPercent = config?.pasar?.taxPercent ?? 5;
  const sellerReceived = Math.max(0, Math.round(totalPaid * (1 - taxPercent / 100)));
  await adjustWallet(guildId, listing.sellerId, sellerReceived);
  await giveInventoryItem(guildId, buyerId, listing.itemKey, qty);

  if (reserved.quantity <= 0) {
    await MarketListing.updateOne({ _id: listing._id }, { $set: { active: false } });
  }

  return {
    ok: true,
    data: {
      itemName: listing.itemName,
      qty,
      totalPaid,
      sellerReceived,
      sellerId: listing.sellerId,
    },
  };
}

/** Batalkan listing (penjual): kembalikan item ke inventory. */
export async function cancelListing(
  guildId: string,
  sellerId: string,
  listingNumber: number,
): Promise<MarketResult<HydratedDocument<MarketListingDocument>>> {
  const listing = await MarketListing.findOne({ guildId, listingNumber, active: true });
  if (!listing) return { ok: false, error: "Listing tidak ditemukan." };
  if (listing.sellerId !== sellerId) return { ok: false, error: "Ini bukan listing milikmu." };

  const remaining = listing.quantity;
  listing.active = false;
  listing.quantity = 0;
  await listing.save();

  if (remaining > 0) await giveInventoryItem(guildId, sellerId, listing.itemKey, remaining);
  return { ok: true, data: listing };
}
