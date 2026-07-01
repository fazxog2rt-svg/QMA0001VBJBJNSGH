/**
 * Realtime event contract shared by apps/bot (producer), apps/api (relay via
 * Redis pub/sub -> Socket.IO), and apps/web (consumer via socket.io-client).
 *
 * The bot NEVER talks to browsers directly. Flow:
 *   discord.js event -> apps/bot publishes to Redis channel `nexus:events`
 *   -> apps/api subscriber re-emits over Socket.IO room `guild:<guildId>`
 *   -> apps/web subscribes to the room and updates the UI live.
 */

export const REDIS_EVENTS_CHANNEL = "nexus:events";

export enum RealtimeEvent {
  MemberJoin = "member.join",
  MemberLeave = "member.leave",
  TicketOpened = "ticket.opened",
  TicketClosed = "ticket.closed",
  TicketMessage = "ticket.message",
  ModerationWarn = "moderation.warn",
  ModerationBan = "moderation.ban",
  ModerationKick = "moderation.kick",
  ModerationTimeout = "moderation.timeout",
  RoleUpdate = "role.update",
  EconomyTransaction = "economy.transaction",
  LevelUp = "level.up",
  LeaderboardUpdate = "leaderboard.update",
  AiLog = "ai.log",
  BotStats = "bot.stats",
  GuildUpdate = "guild.update",
  GiveawayEnded = "giveaway.ended",
  AuditLog = "audit.log",
  BoostEvent = "boost.event",
}

export interface RealtimeEnvelope<T = unknown> {
  event: RealtimeEvent;
  guildId: string;
  timestamp: string;
  data: T;
}

export function guildRoom(guildId: string): string {
  return `guild:${guildId}`;
}

export const ADMIN_ROOM = "admin:global";
