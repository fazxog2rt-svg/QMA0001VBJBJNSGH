import { Schema, model, type InferSchemaType } from "mongoose";

const aiChatLogSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    feature: { type: String, required: true },
    prompt: { type: String, required: true },
    response: { type: String, required: true },
  },
  { timestamps: true },
);

export type AiChatLogDocument = InferSchemaType<typeof aiChatLogSchema>;

export const AiChatLog = model<AiChatLogDocument>("AiChatLog", aiChatLogSchema);
