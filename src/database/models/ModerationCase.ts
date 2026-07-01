import { Schema, model, type InferSchemaType } from "mongoose";

export const MODERATION_CASE_TYPES = [
  "warn",
  "mute",
  "timeout",
  "kick",
  "ban",
  "tempban",
  "softban",
  "unban",
  "unmute",
  "lockdown",
  "purge",
] as const;

const moderationCaseSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    caseNumber: { type: Number, required: true },
    type: { type: String, enum: MODERATION_CASE_TYPES, required: true },
    targetId: { type: String, required: true, index: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, default: "Tidak ada alasan diberikan." },
    duration: { type: Number },
    expiresAt: { type: Date },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

moderationCaseSchema.index({ guildId: 1, caseNumber: 1 }, { unique: true });

export type ModerationCaseDocument = InferSchemaType<typeof moderationCaseSchema>;

export const ModerationCase = model<ModerationCaseDocument>("ModerationCase", moderationCaseSchema);
