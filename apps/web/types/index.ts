/**
 * Frontend-facing type definitions mirroring the Prisma schema
 * (packages/database/prisma/schema.prisma). These are the shapes the API
 * (apps/api) is expected to serialize as JSON — BigInt fields are
 * represented as `number` since they cross the wire as JSON numbers/strings.
 */

export type PlatformRole = "USER" | "MODERATOR" | "ADMIN" | "OWNER";
export type AccountProvider = "DISCORD" | "GOOGLE" | "EMAIL";
export type StaffRole = "MODERATOR" | "ADMIN" | "OWNER";
export type PremiumTier = "FREE" | "PREMIUM" | "PREMIUM_PLUS" | "ENTERPRISE" | "LIFETIME";

export type ModerationAction =
  | "WARN"
  | "MUTE"
  | "TIMEOUT"
  | "KICK"
  | "BAN"
  | "SOFTBAN"
  | "TEMPBAN"
  | "JAIL"
  | "UNBAN"
  | "UNMUTE"
  | "LOCKDOWN";

export type TicketStatus = "OPEN" | "PENDING" | "CLOSED";

export type TransactionType =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "WORK"
  | "TRANSFER"
  | "PURCHASE"
  | "SALE"
  | "GAMBLE"
  | "AUCTION"
  | "FISHING"
  | "MINING"
  | "CRAFTING"
  | "ADMIN_ADJUST";

export type IdentityCardType =
  | "MEMBER"
  | "CITIZEN"
  | "EMPLOYEE"
  | "STUDENT"
  | "VIP"
  | "EVENT_PASS"
  | "STAFF"
  | "POLICE_RP"
  | "MILITARY_RP"
  | "ORGANIZATION"
  | "CLAN"
  | "GUILD"
  | "COMPANY"
  | "COMMUNITY"
  | "CREATOR"
  | "PREMIUM_MEMBER";

export interface User {
  id: string;
  email?: string | null;
  discordId?: string | null;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  role: PlatformRole;
  twoFactorEnabled: boolean;
  isBlacklisted: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface Session {
  id: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: string;
  createdAt: string;
  current?: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
}

export interface Guild {
  id: string;
  name: string;
  iconUrl?: string | null;
  ownerId: string;
  memberCount: number;
  region?: string | null;
  premiumTier: PremiumTier;
  isBlacklisted: boolean;
  installedAt: string;
}

export interface GuildSettings {
  guildId: string;
  prefix: string;
  locale: string;
  timezone: string;
  moderationLogChannelId?: string | null;
  welcomeChannelId?: string | null;
  welcomeMessage?: string | null;
  goodbyeChannelId?: string | null;
  goodbyeMessage?: string | null;
  autoRoleIds: string[];
  antiSpam: boolean;
  antiRaid: boolean;
  antiMention: boolean;
  antiLink: boolean;
  antiInvite: boolean;
  antiScam: boolean;
  antiPhishing: boolean;
  antiTokenGrabber: boolean;
  captchaVerification: boolean;
  levelingEnabled: boolean;
  economyEnabled: boolean;
  ticketsEnabled: boolean;
  musicEnabled: boolean;
  aiAssistantEnabled: boolean;
}

export interface GuildMember {
  id: string;
  guildId: string;
  discordUserId: string;
  username: string;
  avatarUrl?: string | null;
  joinedAt: string;
  isBot: boolean;
  roles: string[];
  xp: number;
  level: number;
  messageCount: number;
  voiceMinutes: number;
}

export interface ModerationCase {
  id: string;
  caseNumber: number;
  guildId: string;
  targetId: string;
  targetTag: string;
  moderatorId: string;
  moderatorTag: string;
  action: ModerationAction;
  reason?: string | null;
  duration?: number | null;
  active: boolean;
  createdAt: string;
  expiresAt?: string | null;
}

export interface AutoModRule {
  id: string;
  guildId: string;
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, unknown>;
  action: ModerationAction;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  guildId: string;
  channelId: string;
  openerId: string;
  openerTag: string;
  subject: string;
  status: TicketStatus;
  category?: string | null;
  assigneeId?: string | null;
  createdAt: string;
  closedAt?: string | null;
  closedReason?: string | null;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  authorId?: string | null;
  authorTag: string;
  content: string;
  isAiReply: boolean;
  createdAt: string;
}

export interface EconomyProfile {
  id: string;
  memberId: string;
  wallet: number;
  bank: number;
  bankCapacity: number;
  lastDaily?: string | null;
  dailyStreak: number;
  job?: string | null;
}

export interface Transaction {
  id: string;
  profileId: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  note?: string | null;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  discordUserId: string;
  username: string;
  avatarUrl?: string | null;
  value: number;
  level?: number;
}

export interface IdentityCard {
  id: string;
  uniqueCode: string;
  guildId: string;
  userId?: string | null;
  discordUserId: string;
  type: IdentityCardType;
  fullName: string;
  avatarUrl?: string | null;
  backgroundUrl?: string | null;
  theme: string;
  badges: string[];
  level: number;
  roleLabel?: string | null;
  serverJoinDate?: string | null;
  signature?: string | null;
  qrCodeUrl?: string | null;
  isVerified: boolean;
  shareSlug: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  tier: PremiumTier;
  guildId?: string | null;
  status: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface Invoice {
  id: string;
  userId: string;
  amountCents: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  guildId?: string | null;
  actorId?: string | null;
  actorTag?: string | null;
  action: string;
  target?: string | null;
  metadata: Record<string, unknown>;
  ipAddress?: string | null;
  createdAt: string;
}

export interface Webhook {
  id: string;
  guildId?: string | null;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: "announcement" | "news" | "changelog";
  version?: string | null;
  published: boolean;
  createdAt: string;
}

export interface GuildStatSnapshot {
  id: string;
  guildId: string;
  memberCount: number;
  messageCount: number;
  commandCount: number;
  voiceMinutes: number;
  capturedAt: string;
}

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  rolloutPercent: number;
  description?: string | null;
}

export interface MaintenanceMode {
  enabled: boolean;
  message?: string | null;
}

export interface LicenseKey {
  id: string;
  code: string;
  tier: PremiumTier;
  durationDays: number;
  redeemedById?: string | null;
  redeemedAt?: string | null;
  createdAt: string;
  expiresAt?: string | null;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  maxRedemptions: number;
  redemptions: number;
  expiresAt?: string | null;
}
