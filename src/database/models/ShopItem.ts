import { Schema, model, type InferSchemaType } from "mongoose";

const shopItemSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    itemKey: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    roleId: { type: String },
    stock: { type: Number, default: -1 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

shopItemSchema.index({ guildId: 1, itemKey: 1 }, { unique: true });

export type ShopItemDocument = InferSchemaType<typeof shopItemSchema>;

export const ShopItem = model<ShopItemDocument>("ShopItem", shopItemSchema);
