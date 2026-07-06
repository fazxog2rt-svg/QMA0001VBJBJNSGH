import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * "Sidang" — persidangan member bermasalah berat sebelum diputuskan (mis. ban).
 * Terbuka: siapa pun boleh ikut asal memenuhi syarat. Tertutup: hanya user tertentu.
 */
const trialSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    caseNumber: { type: Number, required: true },
    defendantId: { type: String, required: true },
    reason: { type: String, required: true },
    type: { type: String, enum: ["terbuka", "tertutup"], required: true },
    status: {
      type: String,
      enum: ["dijadwalkan", "berlangsung", "selesai", "dibatalkan"],
      default: "dijadwalkan",
      index: true,
    },
    scheduledAt: { type: Date, required: true, index: true },
    announceChannelId: { type: String, required: true },
    announceMessageId: { type: String },

    // Syarat ikut untuk sidang terbuka
    requirement: {
      minLevel: { type: Number, default: 0 },
      roleId: { type: String },
    },
    // Daftar user yang diizinkan (khusus sidang tertutup)
    allowedUserIds: { type: [String], default: [] },
    // User yang sudah bergabung / hadir
    participants: { type: [String], default: [] },

    verdict: { type: String },
    startedAnnounced: { type: Boolean, default: false },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);

trialSchema.index({ guildId: 1, caseNumber: 1 }, { unique: true });

export type TrialDocument = InferSchemaType<typeof trialSchema>;
export const Trial = model<TrialDocument>("Trial", trialSchema);
