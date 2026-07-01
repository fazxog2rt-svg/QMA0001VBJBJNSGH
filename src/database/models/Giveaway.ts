import { Schema, model, type InferSchemaType } from "mongoose";

const giveawaySchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true, unique: true },
    prize: { type: String, required: true },
    winnerCount: { type: Number, default: 1, min: 1 },
    hostedBy: { type: String, required: true },
    entrantIds: { type: [String], default: [] },
    winnerIds: { type: [String], default: [] },
    endsAt: { type: Date, required: true, index: true },
    ended: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export type GiveawayDocument = InferSchemaType<typeof giveawaySchema>;

export const Giveaway = model<GiveawayDocument>("Giveaway", giveawaySchema);
