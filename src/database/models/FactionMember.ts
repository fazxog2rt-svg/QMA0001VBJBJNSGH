import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * Pemetaan member -> faksi (satu member hanya boleh di satu faksi per guild).
 * `contribution` = total poin yang disumbang member ke faksinya sepanjang masa.
 */
const factionMemberSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    factionId: { type: Schema.Types.ObjectId, ref: "Faction", required: true, index: true },
    contribution: { type: Number, default: 0, min: 0 },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

factionMemberSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export type FactionMemberDocument = InferSchemaType<typeof factionMemberSchema>;
export const FactionMember = model<FactionMemberDocument>("FactionMember", factionMemberSchema);
