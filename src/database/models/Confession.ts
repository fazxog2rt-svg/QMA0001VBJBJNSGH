import { Schema, model, type InferSchemaType } from "mongoose";

const confessionSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    messageId: { type: String },
    // Disimpan hanya untuk keperluan moderasi (mis. penyalahgunaan) — TIDAK PERNAH ditampilkan publik.
    authorId: { type: String, required: true },
    content: { type: String, required: true, maxlength: 2000 },
    confessionNumber: { type: Number, required: true },
  },
  { timestamps: true },
);

confessionSchema.index({ guildId: 1, confessionNumber: 1 }, { unique: true });

export type ConfessionDocument = InferSchemaType<typeof confessionSchema>;

export const Confession = model<ConfessionDocument>("Confession", confessionSchema);
