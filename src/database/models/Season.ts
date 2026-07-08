import { Schema, model, type InferSchemaType } from "mongoose";

/** Satu musim Battle Pass per guild. Hanya satu yang `active` pada satu waktu. */
const seasonSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    seasonNumber: { type: Number, required: true },
    name: { type: String, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

seasonSchema.index({ guildId: 1, seasonNumber: 1 }, { unique: true });
seasonSchema.index({ guildId: 1, active: 1 });

export type SeasonDocument = InferSchemaType<typeof seasonSchema>;
export const Season = model<SeasonDocument>("Season", seasonSchema);
