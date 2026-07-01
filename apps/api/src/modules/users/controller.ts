import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@nexusbot/database";
import { apiKeyCreateSchema } from "@nexusbot/shared";
import { ApiError } from "../../middleware/errorHandler";
import { generateApiKey } from "../../lib/security";
import { writeAuditLog } from "../../middleware/auditLog";

export const updateMeSchema = z.object({
  username: z.string().min(3).max(32).optional(),
  displayName: z.string().max(64).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export async function getMe(req: Request, res: Response) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user!.sub },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      twoFactorEnabled: true,
      discordId: true,
      createdAt: true,
      lastLoginAt: true,
      subscription: { select: { tier: true, status: true, currentPeriodEnd: true } },
    },
  });
  res.status(200).json({ user });
}

export async function updateMe(req: Request, res: Response) {
  const data = updateMeSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user!.sub },
    data,
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      role: true,
    },
  });
  res.status(200).json({ user });
}

export async function listApiKeys(req: Request, res: Response) {
  const keys = await prisma.apiKey.findMany({
    where: { userId: req.user!.sub },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      rateLimit: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });
  res.status(200).json({ apiKeys: keys });
}

export async function createApiKey(req: Request, res: Response) {
  const { name, scopes, expiresInDays } = apiKeyCreateSchema.parse(req.body);
  const { plaintext, hash, prefix } = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      userId: req.user!.sub,
      name,
      scopes,
      keyHash: hash,
      keyPrefix: prefix,
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86_400_000) : null,
    },
  });

  await writeAuditLog({ actorId: req.user!.sub, action: "user.apikey.create", target: apiKey.id, req });

  // The plaintext key is only ever returned here — it cannot be recovered later.
  res.status(201).json({
    apiKey: { id: apiKey.id, name: apiKey.name, keyPrefix: apiKey.keyPrefix, plaintext },
  });
}

export async function revokeApiKey(req: Request, res: Response) {
  const { id } = req.params;
  const key = await prisma.apiKey.findUnique({ where: { id } });
  if (!key || key.userId !== req.user!.sub) throw ApiError.notFound("API key not found");

  await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  await writeAuditLog({ actorId: req.user!.sub, action: "user.apikey.revoke", target: id, req });

  res.status(200).json({ revoked: true });
}
