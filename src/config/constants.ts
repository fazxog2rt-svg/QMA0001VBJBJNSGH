export const XP_MESSAGE_MIN = 15;
export const XP_MESSAGE_MAX = 25;
export const XP_MESSAGE_COOLDOWN_SECONDS = 60;
export const XP_VOICE_PER_MINUTE = 5;
export const PRESTIGE_MIN_LEVEL = 50;

export const DAILY_COOLDOWN_HOURS = 20;
export const DAILY_STREAK_GRACE_HOURS = 48;
export const REPUTATION_COOLDOWN_HOURS = 24;

export function xpForLevel(level: number): number {
  return 5 * level ** 2 + 50 * level + 100;
}

export function levelFromXp(xp: number): number {
  let level = 0;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  return level;
}

/** Total cumulative XP required to reach the start of `level` from level 0. */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 0; i < level; i += 1) {
    total += xpForLevel(i);
  }
  return total;
}

export const BADGE_DEFINITIONS = [
  { key: "verified", name: "Verified", emoji: "✅", description: "Sudah lolos verifikasi member." },
  { key: "developer", name: "Developer", emoji: "🛠️", description: "Kontributor teknis server." },
  { key: "moderator", name: "Moderator", emoji: "🛡️", description: "Tim moderasi server." },
  { key: "vip", name: "VIP", emoji: "💎", description: "Member VIP." },
  { key: "booster", name: "Booster", emoji: "🚀", description: "Booster server aktif." },
  { key: "supporter", name: "Supporter", emoji: "🤝", description: "Pendukung komunitas." },
  {
    key: "early_member",
    name: "Early Member",
    emoji: "🌱",
    description: "Bergabung di awal server.",
  },
  { key: "og_member", name: "OG Member", emoji: "🏛️", description: "Member generasi pertama." },
  {
    key: "legend",
    name: "Legend",
    emoji: "🏆",
    description: "Kontribusi luar biasa untuk komunitas.",
  },
  { key: "contributor", name: "Contributor", emoji: "🧩", description: "Kontributor aktif." },
  { key: "bug_hunter", name: "Bug Hunter", emoji: "🐛", description: "Menemukan bug penting." },
  { key: "designer", name: "Designer", emoji: "🎨", description: "Kontributor desain." },
  { key: "artist", name: "Artist", emoji: "🖌️", description: "Karya seni untuk komunitas." },
  { key: "streamer", name: "Streamer", emoji: "🎥", description: "Streamer komunitas." },
  { key: "partner", name: "Partner", emoji: "🤝", description: "Partner resmi server." },
  { key: "event_winner", name: "Event Winner", emoji: "🥇", description: "Pemenang event server." },
] as const;

export type BadgeKey = (typeof BADGE_DEFINITIONS)[number]["key"];

export const ACHIEVEMENT_DEFINITIONS = [
  {
    key: "messages_100",
    name: "100 Pesan",
    description: "Kirim 100 pesan.",
    target: 100,
    metric: "messageCount",
  },
  {
    key: "messages_1000",
    name: "1000 Pesan",
    description: "Kirim 1000 pesan.",
    target: 1000,
    metric: "messageCount",
  },
  {
    key: "voice_100h",
    name: "100 Jam Voice",
    description: "Habiskan 100 jam di voice channel.",
    target: 6000,
    metric: "voiceMinutes",
  },
  {
    key: "streak_30",
    name: "Daily Streak 30 Hari",
    description: "Klaim daily 30 hari berturut-turut.",
    target: 30,
    metric: "dailyStreak",
  },
  {
    key: "server_booster",
    name: "Server Booster",
    description: "Boost server ini.",
    target: 1,
    metric: "boosts",
  },
  {
    key: "ticket_helper",
    name: "Ticket Helper",
    description: "Selesaikan 10 tiket sebagai staff.",
    target: 10,
    metric: "ticketsClaimed",
  },
  {
    key: "ai_explorer",
    name: "AI Explorer",
    description: "Gunakan fitur AI 25 kali.",
    target: 25,
    metric: "aiUsageCount",
  },
  {
    key: "top_reputation",
    name: "Top Reputation",
    description: "Capai 100 reputasi.",
    target: 100,
    metric: "reputation",
  },
] as const;

export type AchievementKey = (typeof ACHIEVEMENT_DEFINITIONS)[number]["key"];

export const EMBED_COLORS = {
  primary: 0x5865f2,
  success: 0x57f287,
  warning: 0xfee75c,
  danger: 0xed4245,
  info: 0x5865f2,
  premium: 0xeb459e,
} as const;

export const DEFAULT_LOCALE = "id";

export const COMMAND_CATEGORIES = [
  { key: "ktp", label: "Identitas Digital (KTP)", emoji: "🪪" },
  { key: "profile", label: "Profil Member", emoji: "👤" },
  { key: "leveling", label: "Leveling", emoji: "📈" },
  { key: "community", label: "Komunitas", emoji: "🎉" },
  { key: "tickets", label: "Tiket", emoji: "🎫" },
  { key: "moderation", label: "Moderasi", emoji: "🔨" },
  { key: "security", label: "Keamanan", emoji: "🛡️" },
  { key: "utility", label: "Utilitas", emoji: "🧰" },
  { key: "ai", label: "AI", emoji: "🤖" },
  { key: "fun", label: "Hiburan", emoji: "🎲" },
  { key: "economy", label: "Ekonomi", emoji: "💰" },
  { key: "events", label: "Event", emoji: "📅" },
  { key: "admin", label: "Admin", emoji: "⚙️" },
] as const;
