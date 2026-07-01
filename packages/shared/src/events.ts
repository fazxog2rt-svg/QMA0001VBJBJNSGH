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

/**
 * Bot process-control contract (apps/agent <-> apps/api <-> apps/web).
 *
 * Separate from the guild-events channel above because a BotInstance isn't
 * always tied to a guild, and the payload shape (raw log lines, process
 * status) is different from Discord activity events. Unlike apps/bot (a
 * separate OS process that reaches the API only via Redis pub/sub), the
 * agent connects directly to apps/api's own Socket.IO server over the
 * `/agent` namespace, so both directions are a direct in-process relay
 * (no Redis hop): agent emits `log`/`status` -> API re-emits into Socket.IO
 * room `instance:<instanceId>` -> apps/web listens. Control flows the other
 * way: apps/api emits a `command` event straight to the connected agent's
 * socket.
 */
export enum ProcessEvent {
  Log = "process.log",
  StatusChanged = "process.status",
}

export interface ProcessEnvelope<T = unknown> {
  event: ProcessEvent;
  instanceId: string;
  timestamp: string;
  data: T;
}

export function instanceRoom(instanceId: string): string {
  return `instance:${instanceId}`;
}

export type BotInstanceStatus = "OFFLINE" | "READY" | "STARTING" | "ONLINE" | "STOPPING" | "CRASHED";

export interface ProcessLogPayload {
  stream: "stdout" | "stderr" | "system";
  line: string;
}

export interface ProcessStatusPayload {
  status: BotInstanceStatus;
  pid?: number | null;
  exitCode?: number | null;
}

/** Commands the API sends to the agent over the `/agent` Socket.IO namespace. */
export type AgentCommand = "start" | "stop" | "restart";
