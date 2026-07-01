import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@nexusbot/database";
import type { BotStatsPayload } from "@nexusbot/shared";
import { redisClient } from "../../lib/redis";

const rangeQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).default(30),
});

export async function getGrowth(req: Request, res: Response) {
  const guildId = req.params.id;
  const { days } = rangeQuerySchema.parse(req.query);
  const since = new Date(Date.now() - days * 86_400_000);

  const snapshots = await prisma.guildStatSnapshot.findMany({
    where: { guildId, capturedAt: { gte: since } },
    orderBy: { capturedAt: "asc" },
  });

  res.status(200).json({ snapshots });
}

export async function getCommandAnalytics(req: Request, res: Response) {
  const guildId = req.params.id;
  const { days } = rangeQuerySchema.parse(req.query);
  const since = new Date(Date.now() - days * 86_400_000);

  const snapshots = await prisma.guildStatSnapshot.findMany({
    where: { guildId, capturedAt: { gte: since } },
    orderBy: { capturedAt: "asc" },
    select: { capturedAt: true, commandCount: true },
  });

  const totalCommands = snapshots.reduce((sum: number, s: { commandCount: number }) => sum + s.commandCount, 0);

  res.status(200).json({ series: snapshots, totalCommands });
}

export async function getVoiceActivity(req: Request, res: Response) {
  const guildId = req.params.id;
  const { days } = rangeQuerySchema.parse(req.query);
  const since = new Date(Date.now() - days * 86_400_000);

  const snapshots = await prisma.guildStatSnapshot.findMany({
    where: { guildId, capturedAt: { gte: since } },
    orderBy: { capturedAt: "asc" },
    select: { capturedAt: true, voiceMinutes: true },
  });

  const totalVoiceMinutes = snapshots.reduce(
    (sum: number, s: { voiceMinutes: number }) => sum + s.voiceMinutes,
    0,
  );

  res.status(200).json({ series: snapshots, totalVoiceMinutes });
}

const BOT_STATS_REDIS_KEY = "bot:stats";

/**
 * Live "at a glance" card data for the dashboard home page: ping/cpu/ram/etc,
 * pulled from a Redis key the bot writes to periodically (bot.stats event).
 * Falls back to nulls if the bot hasn't published stats yet (e.g. cold start).
 */
export async function getRealtimeSummary(req: Request, res: Response) {
  const guildId = req.params.id;

  const [raw, guild, openTickets] = await Promise.all([
    redisClient.get(BOT_STATS_REDIS_KEY),
    prisma.guild.findUnique({ where: { id: guildId }, select: { memberCount: true } }),
    prisma.ticket.count({ where: { guildId, status: { in: ["OPEN", "PENDING"] } } }),
  ]);

  const botStats: BotStatsPayload | null = raw ? JSON.parse(raw) : null;

  res.status(200).json({
    memberCount: guild?.memberCount ?? 0,
    openTickets,
    botStats,
  });
}
