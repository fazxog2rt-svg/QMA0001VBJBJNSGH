import { Schema, model, type InferSchemaType } from "mongoose";

const tempVoiceChannelSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true },
    locked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type TempVoiceChannelDocument = InferSchemaType<typeof tempVoiceChannelSchema>;

export const TempVoiceChannel = model<TempVoiceChannelDocument>(
  "TempVoiceChannel",
  tempVoiceChannelSchema,
);
