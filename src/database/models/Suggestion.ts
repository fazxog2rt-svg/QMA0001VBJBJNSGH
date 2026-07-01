import { Schema, model, type InferSchemaType } from "mongoose";

const suggestionSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true, unique: true },
    authorId: { type: String, required: true },
    content: { type: String, required: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ["pending", "approved", "denied", "implemented"],
      default: "pending",
    },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    reviewedBy: { type: String },
    reviewNote: { type: String },
  },
  { timestamps: true },
);

export type SuggestionDocument = InferSchemaType<typeof suggestionSchema>;

export const Suggestion = model<SuggestionDocument>("Suggestion", suggestionSchema);
