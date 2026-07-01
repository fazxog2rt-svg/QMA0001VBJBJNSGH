import type { Request, Response } from "express";
import { prisma } from "@nexusbot/database";
import type { BotStatsPayload } from "@nexusbot/shared";
import { ApiError } from "../../middleware/errorHandler";
import { redisClient } from "../../lib/redis";
import { paginate, paginationQuerySchema, skipTake } from "../../lib/pagination";

const BOT_STATS_REDIS_KEY = "bot:stats";

export async function getBotStats(req: Request, res: Response) {
  const raw = await redisClient.get(BOT_STATS_REDIS_KEY);
  const botStats: BotStatsPayload | null = raw ? JSON.parse(raw) : null;
  res.status(200).json({ botStats });
}

export async function getGuildInfo(req: Request, res: Response) {
  const guild = await prisma.guild.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      name: true,
      iconUrl: true,
      memberCount: true,
      premiumTier: true,
      installedAt: true,
    },
  });
  if (!guild) throw ApiError.notFound("Guild not found");
  res.status(200).json({ guild });
}

export async function getLeaderboard(req: Request, res: Response) {
  const guildId = req.params.id;
  const query = paginationQuerySchema.parse(req.query);

  const [items, total] = await Promise.all([
    prisma.guildMember.findMany({
      where: { guildId, leftAt: null },
      orderBy: { xp: "desc" },
      select: { discordUserId: true, username: true, avatarUrl: true, xp: true, level: true },
      ...skipTake(query),
    }),
    prisma.guildMember.count({ where: { guildId, leftAt: null } }),
  ]);

  res.status(200).json(paginate(items, total, query));
}
