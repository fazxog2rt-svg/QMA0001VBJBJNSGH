import { Schema, model, type InferSchemaType } from "mongoose";

const rsvpEntrySchema = new Schema(
  {
    userId: { type: String, required: true },
    status: { type: String, enum: ["going", "maybe", "declined"], required: true },
    respondedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const communityEventSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    messageId: { type: String },
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, default: "" },
    createdBy: { type: String, required: true },
    startsAt: { type: Date, required: true, index: true },
    rsvp: { type: [rsvpEntrySchema], default: [] },
    attendanceUserIds: { type: [String], default: [] },
    badgeReward: { type: String },
    luckyDrawWinnerId: { type: String },
    reminded: { type: Boolean, default: false },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type CommunityEventDocument = InferSchemaType<typeof communityEventSchema>;

export const CommunityEvent = model<CommunityEventDocument>("CommunityEvent", communityEventSchema);
