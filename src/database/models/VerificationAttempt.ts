import { Schema, model, type InferSchemaType } from "mongoose";

const verificationAttemptSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    method: { type: String, enum: ["captcha", "reaction", "manual"], default: "captcha" },
    status: { type: String, enum: ["pending", "passed", "failed", "flagged"], default: "pending" },
    accountAgeHours: { type: Number },
    flaggedReason: { type: String },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);

verificationAttemptSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export type VerificationAttemptDocument = InferSchemaType<typeof verificationAttemptSchema>;

export const VerificationAttempt = model<VerificationAttemptDocument>(
  "VerificationAttempt",
  verificationAttemptSchema,
);
