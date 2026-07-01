import { Schema, model, type InferSchemaType } from "mongoose";
import type { AchievementKey, BadgeKey } from "../../config/constants";

const badgeSchema = new Schema(
  {
    key: { type: String, required: true },
    awardedAt: { type: Date, default: Date.now },
    awardedBy: { type: String },
  },
  { _id: false },
);

const achievementProgressSchema = new Schema(
  {
    key: { type: String, required: true },
    progress: { type: Number, default: 0 },
    completedAt: { type: Date },
  },
  { _id: false },
);

const inventoryItemSchema = new Schema(
  {
    itemKey: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 0 },
    acquiredAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const memberSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },

    // Profile
    bio: { type: String, maxlength: 500 },
    bannerUrl: { type: String },
    socialMedia: {
      type: Map,
      of: String,
      default: {},
    },
    favoriteColor: { type: String },
    pronouns: { type: String },

    // Reputation & badges
    reputation: { type: Number, default: 0 },
    lastReputationGivenAt: { type: Date },
    badges: { type: [badgeSchema], default: [] },
    achievements: { type: [achievementProgressSchema], default: [] },

    // Leveling
    xp: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 0, min: 0 },
    prestige: { type: Number, default: 0, min: 0 },
    lastMessageXpAt: { type: Date },

    // Activity stats
    messageCount: { type: Number, default: 0 },
    voiceMinutes: { type: Number, default: 0 },
    voiceSessionStartedAt: { type: Date },

    // Community engagement
    dailyStreak: { type: Number, default: 0 },
    lastDailyClaimAt: { type: Date },
    lastWeeklyClaimAt: { type: Date },
    boosts: { type: Number, default: 0 },
    ticketsClaimed: { type: Number, default: 0 },
    aiUsageCount: { type: Number, default: 0 },

    // Economy
    walletBalance: { type: Number, default: 0, min: 0 },
    bankBalance: { type: Number, default: 0, min: 0 },
    inventory: { type: [inventoryItemSchema], default: [] },

    // AFK
    isAfk: { type: Boolean, default: false },
    afkReason: { type: String },
    afkSince: { type: Date },

    firstSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

memberSchema.index({ guildId: 1, userId: 1 }, { unique: true });
memberSchema.index({ guildId: 1, xp: -1 });
memberSchema.index({ guildId: 1, walletBalance: -1 });
memberSchema.index({ guildId: 1, reputation: -1 });

export type MemberDocument = InferSchemaType<typeof memberSchema> & {
  badges: { key: BadgeKey; awardedAt: Date; awardedBy?: string }[];
  achievements: { key: AchievementKey; progress: number; completedAt?: Date }[];
};

export const Member = model<MemberDocument>("Member", memberSchema);
