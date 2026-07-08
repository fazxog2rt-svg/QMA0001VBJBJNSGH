import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * Listing di Marketplace antar-member. Barang yang dijual "ditahan" (escrow):
 * saat listing dibuat, item ditarik dari inventory penjual dan dipegang oleh
 * listing ini sampai terjual atau dibatalkan.
 */
const marketListingSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    listingNumber: { type: Number, required: true },
    sellerId: { type: String, required: true, index: true },
    itemKey: { type: String, required: true },
    itemName: { type: String, required: true }, // snapshot nama saat listing
    pricePerUnit: { type: Number, required: true, min: 1 },
    quantity: { type: Number, required: true, min: 1 }, // sisa stok di listing
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

marketListingSchema.index({ guildId: 1, listingNumber: 1 }, { unique: true });
marketListingSchema.index({ guildId: 1, active: 1 });

export type MarketListingDocument = InferSchemaType<typeof marketListingSchema>;
export const MarketListing = model<MarketListingDocument>("MarketListing", marketListingSchema);
