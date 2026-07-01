import type { HydratedDocument } from "mongoose";
import { Member, type MemberDocument } from "../../database/models/Member";
import { GuildConfig } from "../../database/models/GuildConfig";
import { ShopItem } from "../../database/models/ShopItem";
import { getOrCreateMember } from "../profile/profileService";
import { cached } from "../cache.service";

const WEEKLY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export async function getCurrencySymbol(guildId: string): Promise<string> {
  const guildConfig = await GuildConfig.findOne({ guildId });
  return guildConfig?.economy?.currencySymbol ?? "🪙";
}

export interface WeeklyClaimResult {
  claimed: boolean;
  amount: number;
  nextClaimInMs?: number;
}

export async function claimWeekly(guildId: string, userId: string): Promise<WeeklyClaimResult> {
  const member = await getOrCreateMember(guildId, userId);
  const now = Date.now();

  if (member.lastWeeklyClaimAt) {
    const cooldownExpiresAt = member.lastWeeklyClaimAt.getTime() + WEEKLY_COOLDOWN_MS;
    if (now < cooldownExpiresAt) {
      return { claimed: false, amount: 0, nextClaimInMs: cooldownExpiresAt - now };
    }
  }

  const guildConfig = await GuildConfig.findOne({ guildId });
  const amount = guildConfig?.economy?.weeklyAmount ?? 500;

  member.walletBalance += amount;
  member.lastWeeklyClaimAt = new Date();
  await member.save();

  return { claimed: true, amount };
}

export interface TransferResult {
  success: boolean;
  error?: string;
}

/** Atomically moves `amount` from sender wallet to receiver wallet. */
export async function transferCoins(
  guildId: string,
  senderId: string,
  receiverId: string,
  amount: number,
): Promise<TransferResult> {
  if (amount <= 0) return { success: false, error: "Jumlah harus lebih dari 0." };
  if (senderId === receiverId)
    return { success: false, error: "Kamu tidak bisa transfer ke diri sendiri." };

  const sender = await getOrCreateMember(guildId, senderId);
  if (sender.walletBalance < amount) {
    return { success: false, error: "Saldo wallet-mu tidak cukup." };
  }

  const debited = await Member.findOneAndUpdate(
    { guildId, userId: senderId, walletBalance: { $gte: amount } },
    { $inc: { walletBalance: -amount } },
    { new: true },
  );

  if (!debited) {
    return { success: false, error: "Saldo wallet-mu tidak cukup." };
  }

  await getOrCreateMember(guildId, receiverId);
  await Member.updateOne({ guildId, userId: receiverId }, { $inc: { walletBalance: amount } });

  return { success: true };
}

export interface BankResult {
  success: boolean;
  error?: string;
  member?: HydratedDocument<MemberDocument>;
}

export async function deposit(
  guildId: string,
  userId: string,
  amount: number,
): Promise<BankResult> {
  if (amount <= 0) return { success: false, error: "Jumlah harus lebih dari 0." };

  const member = await getOrCreateMember(guildId, userId);
  if (member.walletBalance < amount)
    return { success: false, error: "Saldo wallet-mu tidak cukup." };

  member.walletBalance -= amount;
  member.bankBalance += amount;
  await member.save();
  return { success: true, member };
}

export async function withdraw(
  guildId: string,
  userId: string,
  amount: number,
): Promise<BankResult> {
  if (amount <= 0) return { success: false, error: "Jumlah harus lebih dari 0." };

  const member = await getOrCreateMember(guildId, userId);
  if (member.bankBalance < amount) return { success: false, error: "Saldo bank-mu tidak cukup." };

  member.bankBalance -= amount;
  member.walletBalance += amount;
  await member.save();
  return { success: true, member };
}

export interface BuyResult {
  success: boolean;
  error?: string;
  itemName?: string;
  roleId?: string;
}

export async function buyItem(
  guildId: string,
  userId: string,
  itemKey: string,
): Promise<BuyResult> {
  const item = await ShopItem.findOne({ guildId, itemKey, enabled: true });
  if (!item) return { success: false, error: "Item tidak ditemukan di toko." };
  if (item.stock === 0) return { success: false, error: "Stok item ini habis." };

  const member = await getOrCreateMember(guildId, userId);
  if (member.walletBalance < item.price)
    return { success: false, error: "Saldo wallet-mu tidak cukup." };

  member.walletBalance -= item.price;

  const existingItem = member.inventory.find((entry) => entry.itemKey === itemKey);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    member.inventory.push({ itemKey, quantity: 1, acquiredAt: new Date() });
  }
  await member.save();

  if (item.stock > 0) {
    item.stock -= 1;
    await item.save();
  }

  return { success: true, itemName: item.name, roleId: item.roleId ?? undefined };
}

export interface EconomyLeaderboardEntry {
  userId: string;
  total: number;
  rank: number;
}

export async function getEconomyLeaderboard(
  guildId: string,
  limit: number,
): Promise<EconomyLeaderboardEntry[]> {
  // Aggregation over wallet+bank is expensive; cache for 60s.
  return cached(`lb:economy:${guildId}:${limit}`, 60, async () => {
    const members = await Member.aggregate<{ userId: string; total: number }>([
      { $match: { guildId } },
      { $addFields: { total: { $add: ["$walletBalance", "$bankBalance"] } } },
      { $sort: { total: -1 } },
      { $limit: limit },
      { $project: { userId: 1, total: 1, _id: 0 } },
    ]);

    return members.map((entry, index) => ({
      userId: entry.userId,
      total: entry.total,
      rank: index + 1,
    }));
  });
}
