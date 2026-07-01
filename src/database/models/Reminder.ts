import { Schema, model, type InferSchemaType } from "mongoose";

const reminderSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    message: { type: String, required: true, maxlength: 500 },
    remindAt: { type: Date, required: true, index: true },
    delivered: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export type ReminderDocument = InferSchemaType<typeof reminderSchema>;

export const Reminder = model<ReminderDocument>("Reminder", reminderSchema);
