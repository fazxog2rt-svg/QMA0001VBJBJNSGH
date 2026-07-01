import type { Request, Response } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@nexusbot/database";
import { ApiError } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../middleware/auditLog";

export const webhookCreateSchema = z.object({
  guildId: z.string().optional(),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

export const webhookUpdateSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  enabled: z.boolean().optional(),
});

export async function listWebhooks(req: Request, res: Response) {
  const webhooks = await prisma.webhook.findMany({
    where: { ownerId: req.user!.sub },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      guildId: true,
      url: true,
      events: true,
      enabled: true,
      createdAt: true,
    },
  });
  res.status(200).json({ webhooks });
}

export async function createWebhook(req: Request, res: Response) {
  const { guildId, url, events } = webhookCreateSchema.parse(req.body);

  if (guildId) {
    const isStaff =
      req.user!.role === "ADMIN" ||
      req.user!.role === "OWNER" ||
      (await prisma.guildStaff.findUnique({
        where: { guildId_userId: { guildId, userId: req.user!.sub } },
      }));
    if (!isStaff) throw ApiError.forbidden("You are not staff on this guild");
  }

  const secret = crypto.randomBytes(32).toString("hex");

  const webhook = await prisma.webhook.create({
    data: { guildId, ownerId: req.user!.sub, url, events, secret },
  });

  await writeAuditLog({ guildId, actorId: req.user!.sub, action: "webhook.create", target: webhook.id, req });

  // The signing secret is only ever returned at creation time.
  res.status(201).json({ webhook });
}

export async function updateWebhook(req: Request, res: Response) {
  const { id } = req.params;
  const data = webhookUpdateSchema.parse(req.body);

  const webhook = await prisma.webhook.findUnique({ where: { id } });
  if (!webhook || webhook.ownerId !== req.user!.sub) throw ApiError.notFound("Webhook not found");

  const updated = await prisma.webhook.update({ where: { id }, data });
  await writeAuditLog({ actorId: req.user!.sub, action: "webhook.update", target: id, metadata: data, req });

  res.status(200).json({ webhook: { ...updated, secret: undefined } });
}

export async function deleteWebhook(req: Request, res: Response) {
  const { id } = req.params;
  const webhook = await prisma.webhook.findUnique({ where: { id } });
  if (!webhook || webhook.ownerId !== req.user!.sub) throw ApiError.notFound("Webhook not found");

  await prisma.webhook.delete({ where: { id } });
  await writeAuditLog({ actorId: req.user!.sub, action: "webhook.delete", target: id, req });

  res.status(204).send();
}
