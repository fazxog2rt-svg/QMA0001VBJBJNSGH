import type { Request, Response } from "express";
import { prisma } from "@nexusbot/database";
import { paginate, paginationQuerySchema, skipTake } from "../../lib/pagination";

export async function getLevelingLeaderboard(req: Request, res: Response) {
  const guildId = req.params.id;
  const query = paginationQuerySchema.parse(req.query);

  const [items, total] = await Promise.all([
    prisma.guildMember.findMany({
      where: { guildId, leftAt: null },
      orderBy: { xp: "desc" },
      select: {
        id: true,
        discordUserId: true,
        username: true,
        avatarUrl: true,
        xp: true,
        level: true,
        messageCount: true,
        voiceMinutes: true,
      },
      ...skipTake(query),
    }),
    prisma.guildMember.count({ where: { guildId, leftAt: null } }),
  ]);

  res.status(200).json(paginate(items, total, query));
}
