import { Schema, model, type InferSchemaType } from "mongoose";

const starboardPostSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    originalMessageId: { type: String, required: true, unique: true },
    originalChannelId: { type: String, required: true },
    starboardMessageId: { type: String, required: true },
    starCount: { type: Number, default: 0 },
    authorId: { type: String, required: true },
  },
  { timestamps: true },
);

export type StarboardPostDocument = InferSchemaType<typeof starboardPostSchema>;

export const StarboardPost = model<StarboardPostDocument>("StarboardPost", starboardPostSchema);
