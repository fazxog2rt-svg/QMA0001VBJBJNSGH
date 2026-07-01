import type { Request, Response } from "express";
import { z } from "zod";
import { prisma, Prisma } from "@nexusbot/database";
import { ApiError } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../middleware/auditLog";

/** Snapshots GuildSettings + AutoModRules + ReactionRoles into Backup.data. */
export async function createBackup(req: Request, res: Response) {
  const guildId = req.params.id;

  const [settings, autoModRules, reactionRoles] = await Promise.all([
    prisma.guildSettings.findUnique({ where: { guildId } }),
    prisma.autoModRule.findMany({ where: { guildId } }),
    prisma.reactionRole.findMany({ where: { guildId } }),
  ]);
  if (!settings) throw ApiError.notFound("Guild has no settings to back up");

  const backup = await prisma.backup.create({
    data: {
      guildId,
      reason: (req.body?.reason as string | undefined) ?? "manual",
      data: { settings, autoModRules, reactionRoles } as object,
    },
  });

  await writeAuditLog({ guildId, actorId: req.user!.sub, action: "admin.backup.create", target: backup.id, req });

  res.status(201).json({ backup });
}

export async function listBackups(req: Request, res: Response) {
  const guildId = req.params.id;
  const backups = await prisma.backup.findMany({
    where: { guildId },
    orderBy: { createdAt: "desc" },
    select: { id: true, reason: true, createdAt: true },
  });
  res.status(200).json({ backups });
}

const restoreBodySchema = z.object({}).optional();

export async function restoreBackup(req: Request, res: Response) {
  restoreBodySchema.parse(req.body);
  const { id: guildId, backupId } = req.params;

  const backup = await prisma.backup.findUnique({ where: { id: backupId } });
  if (!backup || backup.guildId !== guildId) throw ApiError.notFound("Backup not found");

  const snapshot = backup.data as {
    settings?: Record<string, unknown> | null;
    autoModRules?: Array<Record<string, unknown>>;
    reactionRoles?: Array<Record<string, unknown>>;
  };

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (snapshot.settings) {
      const { guildId: _guildId, updatedAt: _updatedAt, ...settingsData } = snapshot.settings as Record<string, unknown>;
      await tx.guildSettings.upsert({
        where: { guildId },
        create: { guildId, ...(settingsData as object) },
        update: settingsData as object,
      });
    }

    if (snapshot.autoModRules) {
      await tx.autoModRule.deleteMany({ where: { guildId } });
      for (const rule of snapshot.autoModRules) {
        const { id: _id, guildId: _g, ...rest } = rule;
        await tx.autoModRule.create({
          data: { guildId, ...rest } as Prisma.AutoModRuleUncheckedCreateInput,
        });
      }
    }

    if (snapshot.reactionRoles) {
      await tx.reactionRole.deleteMany({ where: { guildId } });
      for (const rr of snapshot.reactionRoles) {
        const { id: _id, guildId: _g, ...rest } = rr;
        await tx.reactionRole.create({
          data: { guildId, ...rest } as Prisma.ReactionRoleUncheckedCreateInput,
        });
      }
    }
  });

  await writeAuditLog({ guildId, actorId: req.user!.sub, action: "admin.backup.restore", target: backupId, req });

  res.status(200).json({ restored: true, backupId });
}
