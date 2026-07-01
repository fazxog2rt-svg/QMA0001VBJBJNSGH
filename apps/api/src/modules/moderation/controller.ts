import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@nexusbot/database";
import { moderationActionSchema } from "@nexusbot/shared";
import { ApiError } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../middleware/auditLog";
import { paginate, paginationQuerySchema, skipTake } from "../../lib/pagination";
import { recordModerationCase } from "./service";

const VALID_ACTIONS = new Set([
  "warn",
  "kick",
  "ban",
  "timeout",
  "softban",
  "tempban",
  "unban",
]);

export const moderationCasesQuerySchema = paginationQuerySchema.extend({
  targetId: z.string().optional(),
  action: z.string().optional(),
});

export async function listCases(req: Request, res: Response) {
  const guildId = req.params.id;
  const query = moderationCasesQuerySchema.parse(req.query);

  const where = {
    guildId,
    ...(query.targetId ? { targetId: query.targetId } : {}),
    ...(query.action ? { action: query.action.toUpperCase() as never } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.moderationCase.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...skipTake(query),
    }),
    prisma.moderationCase.count({ where }),
  ]);

  res.status(200).json(paginate(items, total, query));
}

export async function performAction(req: Request, res: Response) {
  const { id: guildId, action } = req.params;
  if (!VALID_ACTIONS.has(action)) {
    throw ApiError.badRequest(`Unsupported moderation action: ${action}`);
  }
  const { targetId, reason, durationSeconds } = moderationActionSchema.parse(req.body);

  if ((action === "timeout" || action === "tempban") && !durationSeconds) {
    throw ApiError.badRequest(`${action} requires durationSeconds`);
  }

  const moderationCase = await recordModerationCase({
    guildId,
    action,
    targetId,
    targetTag: targetId, // Discord tag is enriched by the bot; API only has the id at write-time.
    moderatorId: req.user!.sub,
    moderatorTag: req.user!.sub,
    reason,
    durationSeconds,
  });

  await writeAuditLog({
    guildId,
    actorId: req.user!.sub,
    action: `moderation.${action}`,
    target: targetId,
    metadata: { reason, durationSeconds, caseId: moderationCase.id },
    req,
  });

  res.status(201).json({ case: moderationCase });
}

export async function listAutoModRules(req: Request, res: Response) {
  const rules = await prisma.autoModRule.findMany({ where: { guildId: req.params.id } });
  res.status(200).json({ rules });
}

export const autoModRuleUpdateSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
  action: z
    .enum(["WARN", "MUTE", "TIMEOUT", "KICK", "BAN", "SOFTBAN", "TEMPBAN", "JAIL", "UNBAN", "UNMUTE", "LOCKDOWN"])
    .optional(),
});

export async function updateAutoModRule(req: Request, res: Response) {
  const { id: guildId, ruleId } = req.params;
  const data = autoModRuleUpdateSchema.parse(req.body);

  const rule = await prisma.autoModRule.findUnique({ where: { id: ruleId } });
  if (!rule || rule.guildId !== guildId) throw ApiError.notFound("AutoMod rule not found");

  const updated = await prisma.autoModRule.update({
    where: { id: ruleId },
    data: { ...data, config: data.config as object | undefined },
  });

  await writeAuditLog({
    guildId,
    actorId: req.user!.sub,
    action: "automod.rule.update",
    target: ruleId,
    metadata: data,
    req,
  });

  res.status(200).json({ rule: updated });
}
