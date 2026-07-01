import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@nexusbot/database";
import { ApiError } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../middleware/auditLog";
import { paginationQuerySchema, skipTake } from "../../lib/pagination";

export async function getLeaderboard(req: Request, res: Response) {
  const guildId = req.params.id;
  const query = paginationQuerySchema.parse(req.query);

  const profiles = await prisma.economyProfile.findMany({
    where: { member: { guildId } },
    include: { member: { select: { discordUserId: true, username: true, avatarUrl: true } } },
    orderBy: [{ wallet: "desc" }],
    ...skipTake(query),
  });

  // BigInt fields must be serialized as strings for JSON.
  const items = profiles.map((p) => ({
    ...p,
    wallet: p.wallet.toString(),
    bank: p.bank.toString(),
    bankCapacity: p.bankCapacity.toString(),
  }));

  res.status(200).json({ items, page: query.page, pageSize: query.pageSize });
}

export async function getMemberEconomy(req: Request, res: Response) {
  const { id: guildId, memberId } = req.params;
  const member = await prisma.guildMember.findFirst({
    where: { guildId, OR: [{ id: memberId }, { discordUserId: memberId }] },
    include: { economy: { include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } } } },
  });
  if (!member) throw ApiError.notFound("Guild member not found");

  const economy = member.economy
    ? {
        ...member.economy,
        wallet: member.economy.wallet.toString(),
        bank: member.economy.bank.toString(),
        bankCapacity: member.economy.bankCapacity.toString(),
        transactions: member.economy.transactions.map((t) => ({
          ...t,
          amount: t.amount.toString(),
          balanceAfter: t.balanceAfter.toString(),
        })),
      }
    : null;

  res.status(200).json({ member: { ...member, economy: undefined }, economy });
}

export const economyAdjustSchema = z.object({
  amount: z.number().int(),
  target: z.enum(["wallet", "bank"]).default("wallet"),
  note: z.string().max(280).optional(),
});

export async function adjustEconomy(req: Request, res: Response) {
  const { id: guildId, memberId } = req.params;
  const { amount, target, note } = economyAdjustSchema.parse(req.body);

  const member = await prisma.guildMember.findFirst({
    where: { guildId, OR: [{ id: memberId }, { discordUserId: memberId }] },
    include: { economy: true },
  });
  if (!member) throw ApiError.notFound("Guild member not found");

  const profile =
    member.economy ??
    (await prisma.economyProfile.create({ data: { memberId: member.id } }));

  const updated = await prisma.economyProfile.update({
    where: { id: profile.id },
    data: { [target]: { increment: amount } },
  });

  const balanceAfter = target === "wallet" ? updated.wallet : updated.bank;

  const transaction = await prisma.transaction.create({
    data: {
      profileId: profile.id,
      type: "ADMIN_ADJUST",
      amount,
      balanceAfter,
      note: note ?? `Admin adjustment by ${req.user!.sub}`,
    },
  });

  await writeAuditLog({
    guildId,
    actorId: req.user!.sub,
    action: "economy.admin_adjust",
    target: member.discordUserId,
    metadata: { amount, target, note },
    req,
  });

  res.status(200).json({
    profile: {
      ...updated,
      wallet: updated.wallet.toString(),
      bank: updated.bank.toString(),
      bankCapacity: updated.bankCapacity.toString(),
    },
    transaction: { ...transaction, amount: transaction.amount.toString(), balanceAfter: transaction.balanceAfter.toString() },
  });
}
