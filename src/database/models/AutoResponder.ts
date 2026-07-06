import { Schema, model, type InferSchemaType } from "mongoose";

const autoResponderSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    trigger: { type: String, required: true }, // disimpan lowercase
    response: { type: String, required: true },
    matchType: {
      type: String,
      enum: ["exact", "contains", "startsWith"],
      default: "contains",
    },
    enabled: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);

autoResponderSchema.index({ guildId: 1, trigger: 1 }, { unique: true });

export type AutoResponderDocument = InferSchemaType<typeof autoResponderSchema>;
export const AutoResponder = model<AutoResponderDocument>("AutoResponder", autoResponderSchema);
