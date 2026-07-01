import { Schema, model, type InferSchemaType } from "mongoose";

const faqSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    question: { type: String, required: true, maxlength: 200 },
    answer: { type: String, required: true, maxlength: 1000 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);

export type FaqDocument = InferSchemaType<typeof faqSchema>;

export const Faq = model<FaqDocument>("Faq", faqSchema);
