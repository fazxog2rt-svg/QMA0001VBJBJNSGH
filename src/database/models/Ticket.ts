import { Schema, model, type InferSchemaType } from "mongoose";

const ticketMessageSchema = new Schema(
  {
    authorId: { type: String, required: true },
    authorTag: { type: String, required: true },
    content: { type: String, default: "" },
    attachmentUrls: { type: [String], default: [] },
    isAiReply: { type: Boolean, default: false },
    sentAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ticketSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    ticketNumber: { type: Number, required: true },
    channelId: { type: String, required: true },
    category: { type: String, default: "general" },
    openedBy: { type: String, required: true },
    claimedBy: { type: String },
    status: {
      type: String,
      enum: ["open", "claimed", "closed", "reopened"],
      default: "open",
      index: true,
    },
    rating: { type: Number, min: 1, max: 5 },
    ratingComment: { type: String },
    transcriptHtmlUrl: { type: String },
    transcriptPdfUrl: { type: String },
    messages: { type: [ticketMessageSchema], default: [] },
    closedBy: { type: String },
    closedAt: { type: Date },
  },
  { timestamps: true },
);

ticketSchema.index({ guildId: 1, ticketNumber: 1 }, { unique: true });

export type TicketDocument = InferSchemaType<typeof ticketSchema>;

export const Ticket = model<TicketDocument>("Ticket", ticketSchema);
