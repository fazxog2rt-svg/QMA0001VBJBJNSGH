import { Schema, model, type InferSchemaType } from "mongoose";

/** Karakter RPG persisten milik seorang member (satu per guild). */
const rpgCharacterSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    className: { type: String, required: true }, // key kelas (ksatria/penyihir/pemanah)
    level: { type: Number, default: 1, min: 1 },
    xp: { type: Number, default: 0, min: 0 },
    maxHp: { type: Number, required: true },
    hp: { type: Number, required: true },
    attack: { type: Number, required: true },
    defense: { type: Number, required: true },
    gold: { type: Number, default: 0, min: 0 },
    potions: { type: Number, default: 0, min: 0 },
    weaponName: { type: String },
    weaponAtk: { type: Number, default: 0 },
    armorName: { type: String },
    armorDef: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
  },
  { timestamps: true },
);

rpgCharacterSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export type RpgCharacterDocument = InferSchemaType<typeof rpgCharacterSchema>;
export const RpgCharacter = model<RpgCharacterDocument>("RpgCharacter", rpgCharacterSchema);
