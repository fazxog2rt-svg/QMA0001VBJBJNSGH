import { Schema, model, type InferSchemaType } from "mongoose";

const stickyMessageSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true, unique: true, index: true },
    content: { type: String, required: true },
    lastMessageId: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);

export type StickyMessageDocument = InferSchemaType<typeof stickyMessageSchema>;

export const StickyMessage = model<StickyMessageDocument>("StickyMessage", stickyMessageSchema);
