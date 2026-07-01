import { Schema, model, type InferSchemaType } from "mongoose";

const birthdaySchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    day: { type: Number, required: true, min: 1, max: 31 },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number },
    lastAnnouncedYear: { type: Number },
  },
  { timestamps: true },
);

birthdaySchema.index({ guildId: 1, userId: 1 }, { unique: true });

export type BirthdayDocument = InferSchemaType<typeof birthdaySchema>;

export const Birthday = model<BirthdayDocument>("Birthday", birthdaySchema);
