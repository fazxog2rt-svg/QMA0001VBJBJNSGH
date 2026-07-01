import { prisma, ModerationAction, type ModerationCase } from "@nexusbot/database";
import { RealtimeEvent } from "@nexusbot/shared";
import { publishRealtimeEvent } from "../../lib/redis";

export interface CreateCaseInput {
  guildId: string;
  targetId: string;
  targetTag: string;
  moderatorId: string;
  moderatorTag: string;
  action: ModerationAction;
  reason?: string | null;
  duration?: number | null;
  expiresAt?: Date | null;
  memberId?: string | null;
}

const ACTION_TO_REALTIME_EVENT: Partial<Record<ModerationAction, RealtimeEvent>> = {
  WARN: RealtimeEvent.ModerationWarn,
  BAN: RealtimeEvent.ModerationBan,
  TEMPBAN: RealtimeEvent.ModerationBan,
  SOFTBAN: RealtimeEvent.ModerationBan,
  KICK: RealtimeEvent.ModerationKick,
  TIMEOUT: RealtimeEvent.ModerationTimeout,
  MUTE: RealtimeEvent.ModerationTimeout,
};

/**
 * Creates a ModerationCase with an auto-incrementing per-guild caseNumber and
 * publishes the matching realtime event. Wrapped in a transaction so the
 * case-number read+write is atomic under concurrent moderation actions.
 */
export async function createModerationCase(input: CreateCaseInput): Promise<ModerationCase> {
  const created = await prisma.$transaction(async (tx) => {
    const last = await tx.moderationCase.findFirst({
      where: { guildId: input.guildId },
      orderBy: { caseNumber: "desc" },
      select: { caseNumber: true },
    });
    const caseNumber = (last?.caseNumber ?? 0) + 1;

    return tx.moderationCase.create({
      data: {
        guildId: input.guildId,
        caseNumber,
        targetId: input.targetId,
        targetTag: input.targetTag,
        moderatorId: input.moderatorId,
        moderatorTag: input.moderatorTag,
        action: input.action,
        reason: input.reason ?? null,
        duration: input.duration ?? null,
        expiresAt: input.expiresAt ?? null,
        memberId: input.memberId ?? null,
      },
    });
  });

  const event = ACTION_TO_REALTIME_EVENT[input.action];
  if (event) {
    await publishRealtimeEvent(event, input.guildId, {
      caseNumber: created.caseNumber,
      targetId: created.targetId,
      targetTag: created.targetTag,
      moderatorId: created.moderatorId,
      moderatorTag: created.moderatorTag,
      action: created.action,
      reason: created.reason,
      duration: created.duration,
    });
  }

  return created;
}

export async function getCaseByNumber(guildId: string, caseNumber: number) {
  return prisma.moderationCase.findUnique({
    where: { guildId_caseNumber: { guildId, caseNumber } },
  });
}

export async function deactivateActiveCases(
  guildId: string,
  targetId: string,
  actions: ModerationAction[],
): Promise<void> {
  await prisma.moderationCase.updateMany({
    where: { guildId, targetId, action: { in: actions }, active: true },
    data: { active: false },
  });
}
