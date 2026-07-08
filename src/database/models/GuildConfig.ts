import { Schema, model, type InferSchemaType } from "mongoose";

const guildConfigSchema = new Schema(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    locale: { type: String, default: "id" },

    welcomeChannelId: { type: String },
    welcomeMessage: {
      type: String,
      default: "Selamat datang {user} di {server}! Sekarang kita ada {memberCount} member.",
    },
    goodbyeChannelId: { type: String },
    goodbyeMessage: { type: String, default: "{user} telah meninggalkan {server}." },
    autoRoleIds: { type: [String], default: [] },
    birthdayChannelId: { type: String },

    logChannels: {
      moderation: { type: String },
      message: { type: String },
      voice: { type: String },
      role: { type: String },
      channel: { type: String },
      invite: { type: String },
      ticket: { type: String },
      economy: { type: String },
      ai: { type: String },
      verification: { type: String },
    },

    leveling: {
      enabled: { type: Boolean, default: true },
      announceChannelId: { type: String },
      roleRewards: {
        type: [
          new Schema(
            { level: { type: Number, required: true }, roleId: { type: String, required: true } },
            { _id: false },
          ),
        ],
        default: [],
      },
    },

    autoMod: {
      antiSpam: { type: Boolean, default: true },
      antiInvite: { type: Boolean, default: true },
      antiLink: { type: Boolean, default: false },
      antiScam: { type: Boolean, default: true },
      antiMentionSpam: { type: Boolean, default: true },
      maxMentionsPerMessage: { type: Number, default: 5 },
    },

    moderation: {
      mutedRoleId: { type: String },
      nicknameFilterWords: { type: [String], default: [] },
    },

    security: {
      antiRaid: { type: Boolean, default: true },
      raidJoinThreshold: { type: Number, default: 10 },
      raidJoinWindowSeconds: { type: Number, default: 10 },
      antiNuke: { type: Boolean, default: true },
      antiNukeMaxActions: { type: Number, default: 3 },
      antiNukeWindowSeconds: { type: Number, default: 60 },
      captchaVerification: { type: Boolean, default: false },
      altDetectionMinAccountAgeHours: { type: Number, default: 24 },
      verifiedRoleId: { type: String },
      unverifiedRoleId: { type: String },
      logChannelId: { type: String },
    },

    tickets: {
      categoryChannelId: { type: String },
      logChannelId: { type: String },
      supportRoleIds: { type: [String], default: [] },
      nextTicketNumber: { type: Number, default: 1 },
      ticketTypes: {
        type: [
          new Schema(
            {
              key: { type: String, required: true },
              label: { type: String, required: true },
              emoji: { type: String, default: "🎫" },
            },
            { _id: false },
          ),
        ],
        default: [
          { key: "umum", label: "Pertanyaan Umum", emoji: "❓" },
          { key: "laporan", label: "Laporan Member", emoji: "🚨" },
          { key: "teknis", label: "Bantuan Teknis", emoji: "🛠️" },
        ],
      },
    },

    starboard: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String },
      threshold: { type: Number, default: 5 },
      emoji: { type: String, default: "⭐" },
    },

    economy: {
      currencySymbol: { type: String, default: "🪙" },
      dailyAmount: { type: Number, default: 100 },
      weeklyAmount: { type: Number, default: 500 },
    },

    aiAssistantEnabled: { type: Boolean, default: false },

    // Channel-channel yang auto-dibalas AI. Tiap channel punya persona (gaya
    // bahasa) & model OpenRouter sendiri, dikonfigurasi lewat /ai-channel.
    aiChannels: {
      type: [
        new Schema(
          {
            channelId: { type: String, required: true },
            persona: { type: String, default: "ramah" },
            model: { type: String, default: "openai/gpt-4o-mini" },
            customInstruction: { type: String, default: "" },
            enabled: { type: Boolean, default: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    tempVoice: {
      enabled: { type: Boolean, default: false },
      hubChannelId: { type: String },
      categoryChannelId: { type: String },
    },

    // Motivasi otomatis (dibuat AI, terasa alami)
    motivation: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String },
      categories: { type: [String], default: ["kehidupan"] },
      intervalHours: { type: Number, default: 24 }, // jarak antar kiriman (jam)
      lastPostedAt: { type: Date }, // kapan terakhir dikirim
    },

    // Penomoran sidang (jadwal sidang member)
    sidang: {
      nextTrialNumber: { type: Number, default: 1 },
    },

    // Faksi & Perang Faksi mingguan
    faksi: {
      announceChannelId: { type: String }, // channel pengumuman hasil perang
      createCost: { type: Number, default: 5000 }, // biaya bikin faksi (coins)
      weeklyRewardBase: { type: Number, default: 10000 }, // hadiah kas untuk juara
      lastWarResetAt: { type: Date }, // kapan reset mingguan terakhir
    },

    suggestions: {
      channelId: { type: String },
    },

    // Channel tujuan laporan member (/report)
    reportChannelId: { type: String },

    // Counting game: member menghitung berurutan di satu channel
    counting: {
      channelId: { type: String },
      current: { type: Number, default: 0 },
      lastUserId: { type: String },
      highScore: { type: Number, default: 0 },
    },

    confession: {
      channelId: { type: String },
      nextConfessionNumber: { type: Number, default: 1 },
    },
  },
  { timestamps: true },
);

export type GuildConfigDocument = InferSchemaType<typeof guildConfigSchema>;

export const GuildConfig = model<GuildConfigDocument>("GuildConfig", guildConfigSchema);
