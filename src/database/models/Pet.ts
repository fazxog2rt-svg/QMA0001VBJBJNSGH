import { Schema, model, type InferSchemaType } from "mongoose";

const petSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    species: { type: String, required: true },
    level: { type: Number, default: 1, min: 1 },
    xp: { type: Number, default: 0, min: 0 },
    // 0-100; menurun seiring waktu. Kalau 0 pet jadi lemas/sakit.
    hunger: { type: Number, default: 100, min: 0, max: 100 },
    happiness: { type: Number, default: 100, min: 0, max: 100 },
    lastFedAt: { type: Date, default: Date.now },
    lastPlayedAt: { type: Date },
    lastDecayAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

petSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export type PetDocument = InferSchemaType<typeof petSchema>;
export const Pet = model<PetDocument>("Pet", petSchema);
