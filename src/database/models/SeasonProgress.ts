import { Schema, model, type InferSchemaType } from "mongoose";

const missionSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, required: true },
    target: { type: Number, required: true },
    progress: { type: Number, default: 0 },
    xp: { type: Number, required: true },
    completed: { type: Boolean, default: false },
  },
  { _id: false },
);

/**
 * Progres Battle Pass seorang member pada satu musim. Menyimpan Season XP, tier,
 * tier yang sudah diklaim (gratis & premium), status premium, dan misi
 * harian/mingguan (di-refresh saat ganti hari/pekan).
 */
const seasonProgressSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    seasonNumber: { type: Number, required: true },
    xp: { type: Number, default: 0, min: 0 },
    tier: { type: Number, default: 0, min: 0 },
    premium: { type: Boolean, default: false },
    claimedFree: { type: [Number], default: [] }, // tier yang sudah diklaim (gratis)
    claimedPremium: { type: [Number], default: [] }, // tier yang sudah diklaim (premium)
    dailyMissions: { type: [missionSchema], default: [] },
    weeklyMissions: { type: [missionSchema], default: [] },
    lastDailyResetDay: { type: String }, // "YYYY-MM-DD" WIB
    lastWeeklyResetKey: { type: String }, // "YYYY-Www"
  },
  { timestamps: true },
);

seasonProgressSchema.index({ guildId: 1, userId: 1, seasonNumber: 1 }, { unique: true });

export type SeasonProgressDocument = InferSchemaType<typeof seasonProgressSchema>;
export const SeasonProgress = model<SeasonProgressDocument>("SeasonProgress", seasonProgressSchema);
