import { prisma } from "@nexusbot/database";
import type { ModerationAction } from "@nexusbot/database";
import { RealtimeEvent, REDIS_EVENTS_CHANNEL, type RealtimeEnvelope } from "@nexusbot/shared";
import { redisPublisher, publishBotCommand, type BotCommandPayload } from "../../lib/redis";

const ACTION_TO_MODEL: Record<string, ModerationAction> = {
  warn: "WARN",
  kick: "KICK",
  ban: "BAN",
  timeout: "TIMEOUT",
  softban: "SOFTBAN",
  tempban: "TEMPBAN",
  unban: "UNBAN",
};

const ACTION_TO_REALTIME_EVENT: Partial<Record<string, RealtimeEvent>> = {
  warn: RealtimeEvent.ModerationWarn,
  ban: RealtimeEvent.ModerationBan,
  kick: RealtimeEvent.ModerationKick,
  timeout: RealtimeEvent.ModerationTimeout,
};

const ACTION_TO_BOT_COMMAND: Record<string, BotCommandPayload["action"]> = {
  warn: "warn",
  kick: "kick",
  ban: "ban",
  timeout: "timeout",
  softban: "softban",
  tempban: "tempban",
  unban: "unban",
};

export function moderationActionToEnum(action: string): ModerationAction {
  const mapped = ACTION_TO_MODEL[action];
  if (!mapped) throw new Error(`Unsupported moderation action: ${action}`);
  return mapped;
}

/**
 * Writes a ModerationCase row optimistically (the dashboard shows it
 * immediately), then publishes a bot-command so apps/bot performs the real
 * Discord-side action, and finally re-broadcasts the same event over the
 * REDIS_EVENTS_CHANNEL/Socket.IO so all connected dashboards update live —
 * consistent with events the bot itself would publish.
 */
export async function recordModerationCase(params: {
  guildId: string;
  action: string;
  targetId: string;
  targetTag: string;
  moderatorId: string;
  moderatorTag: string;
  reason?: string;
  durationSeconds?: number;
}) {
  const lastCase = await prisma.moderationCase.findFirst({
    where: { guildId: params.guildId },
    orderBy: { caseNumber: "desc" },
    select: { caseNumber: true },
  });
  const caseNumber = (lastCase?.caseNumber ?? 0) + 1;

  const moderationCase = await prisma.moderationCase.create({
    data: {
      guildId: params.guildId,
      caseNumber,
      targetId: params.targetId,
      targetTag: params.targetTag,
      moderatorId: params.moderatorId,
      moderatorTag: params.moderatorTag,
      action: moderationActionToEnum(params.action),
      reason: params.reason,
      duration: params.durationSeconds,
      expiresAt: params.durationSeconds
        ? new Date(Date.now() + params.durationSeconds * 1000)
        : null,
    },
  });

  const botAction = ACTION_TO_BOT_COMMAND[params.action];
  if (botAction) {
    await publishBotCommand({
      action: botAction,
      guildId: params.guildId,
      targetId: params.targetId,
      moderatorId: params.moderatorId,
      reason: params.reason,
      durationSeconds: params.durationSeconds,
    });
  }

  const realtimeEvent = ACTION_TO_REALTIME_EVENT[params.action];
  if (realtimeEvent) {
    const envelope: RealtimeEnvelope = {
      event: realtimeEvent,
      guildId: params.guildId,
      timestamp: new Date().toISOString(),
      data: moderationCase,
    };
    await redisPublisher.publish(REDIS_EVENTS_CHANNEL, JSON.stringify(envelope));
  }

  return moderationCase;
}
