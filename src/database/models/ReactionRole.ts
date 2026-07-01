import { Schema, model, type InferSchemaType } from "mongoose";

const reactionRoleSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    messageId: { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    emoji: { type: String, required: true },
    roleId: { type: String, required: true },
  },
  { timestamps: true },
);

reactionRoleSchema.index({ messageId: 1, emoji: 1 }, { unique: true });

export type ReactionRoleDocument = InferSchemaType<typeof reactionRoleSchema>;

export const ReactionRole = model<ReactionRoleDocument>("ReactionRole", reactionRoleSchema);
