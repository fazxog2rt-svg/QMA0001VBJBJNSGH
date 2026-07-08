import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * Faksi/kubu dalam sebuah guild. Anggota bersaing tiap minggu (Perang Faksi)
 * mengumpulkan poin kontribusi dari aktivitas & donasi. `weeklyPoints` direset
 * tiap pekan; `totalPoints` akumulasi sepanjang masa.
 */
const factionSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    name: { type: String, required: true }, // nama tampilan
    nameKey: { type: String, required: true }, // lowercase untuk unik & pencarian
    emoji: { type: String, default: "🏳️" },
    color: { type: String, default: "#5865f2" }, // hex warna embed
    leaderId: { type: String, required: true },
    treasury: { type: Number, default: 0, min: 0 }, // kas faksi (coins)
    weeklyPoints: { type: Number, default: 0, min: 0 },
    totalPoints: { type: Number, default: 0, min: 0 },
    wins: { type: Number, default: 0, min: 0 }, // jumlah kemenangan Perang Faksi
    memberCount: { type: Number, default: 1, min: 0 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);

factionSchema.index({ guildId: 1, nameKey: 1 }, { unique: true });
factionSchema.index({ guildId: 1, weeklyPoints: -1 });

export type FactionDocument = InferSchemaType<typeof factionSchema>;
export const Faction = model<FactionDocument>("Faction", factionSchema);
