import type { Request, Response } from "express";
import { prisma } from "@nexusbot/database";
import { identityCardCreateSchema } from "@nexusbot/shared";
import { ApiError } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../middleware/auditLog";
import { paginate, paginationQuerySchema, skipTake } from "../../lib/pagination";

/**
 * The verify route (`POST /identity-cards/:cardId/verify`) doesn't carry a
 * guildId route param, so staff membership is checked here against the
 * card's owning guild rather than via the requireGuildStaff middleware.
 */
async function assertGuildStaffOrAdmin(userId: string, role: string, guildId: string) {
  if (role === "ADMIN" || role === "OWNER") return;
  const staff = await prisma.guildStaff.findUnique({
    where: { guildId_userId: { guildId, userId } },
  });
  if (!staff) throw ApiError.forbidden("You are not staff on this guild");
}

export async function createIdentityCard(req: Request, res: Response) {
  const guildId = req.params.id;
  const data = identityCardCreateSchema.parse(req.body);

  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) throw ApiError.notFound("Guild not found");

  const card = await prisma.identityCard.create({
    data: {
      guildId,
      userId: req.user!.sub,
      discordUserId: data.discordUserId,
      type: data.type,
      fullName: data.fullName,
      theme: data.theme,
      roleLabel: data.roleLabel,
    },
  });

  await writeAuditLog({
    guildId,
    actorId: req.user!.sub,
    action: "identity_card.create",
    target: card.id,
    req,
  });

  res.status(201).json({ card });
}

export async function listIdentityCards(req: Request, res: Response) {
  const guildId = req.params.id;
  const query = paginationQuerySchema.parse(req.query);

  const [items, total] = await Promise.all([
    prisma.identityCard.findMany({
      where: { guildId },
      orderBy: { createdAt: "desc" },
      ...skipTake(query),
    }),
    prisma.identityCard.count({ where: { guildId } }),
  ]);

  res.status(200).json(paginate(items, total, query));
}

/** Public route — no auth. Powers shareable identity-card links. */
export async function getCardByShareSlug(req: Request, res: Response) {
  const card = await prisma.identityCard.findUnique({ where: { shareSlug: req.params.slug } });
  if (!card) throw ApiError.notFound("Identity card not found");

  res.status(200).json({
    card: {
      id: card.id,
      type: card.type,
      fullName: card.fullName,
      avatarUrl: card.avatarUrl,
      backgroundUrl: card.backgroundUrl,
      theme: card.theme,
      badges: card.badges,
      level: card.level,
      roleLabel: card.roleLabel,
      isVerified: card.isVerified,
      createdAt: card.createdAt,
    },
  });
}

export async function verifyIdentityCard(req: Request, res: Response) {
  const { cardId } = req.params;
  const card = await prisma.identityCard.findUnique({ where: { id: cardId } });
  if (!card) throw ApiError.notFound("Identity card not found");

  await assertGuildStaffOrAdmin(req.user!.sub, req.user!.role, card.guildId);

  const updated = await prisma.identityCard.update({
    where: { id: cardId },
    data: { isVerified: true },
  });

  await writeAuditLog({
    guildId: card.guildId,
    actorId: req.user!.sub,
    action: "identity_card.verify",
    target: cardId,
    req,
  });

  res.status(200).json({ card: updated });
}
