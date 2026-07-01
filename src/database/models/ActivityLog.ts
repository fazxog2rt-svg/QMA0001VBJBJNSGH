import { Schema, model, type InferSchemaType } from "mongoose";

export const ACTIVITY_LOG_TYPES = [
  "moderation",
  "role",
  "message",
  "channel",
  "voice",
  "invite",
  "ticket",
  "economy",
  "ai",
  "verification",
] as const;

const activityLogSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    type: { type: String, enum: ACTIVITY_LOG_TYPES, required: true, index: true },
    actorId: { type: String },
    targetId: { type: String },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

activityLogSchema.index({ guildId: 1, type: 1, createdAt: -1 });

export type ActivityLogDocument = InferSchemaType<typeof activityLogSchema>;

export const ActivityLog = model<ActivityLogDocument>("ActivityLog", activityLogSchema);
