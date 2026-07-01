import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@nexusbot/database";
import { ApiError } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../middleware/auditLog";
import { paginate, paginationQuerySchema, skipTake } from "../../lib/pagination";

export const guildSettingsUpdateSchema = z.object({
  prefix: z.string().min(1).max(8).optional(),
  locale: z.string().min(2).max(10).optional(),
  timezone: z.string().min(1).max(64).optional(),
  moderationLogChannelId: z.string().nullable().optional(),
  welcomeChannelId: z.string().nullable().optional(),
  welcomeMessage: z.string().max(2000).nullable().optional(),
  goodbyeChannelId: z.string().nullable().optional(),
  goodbyeMessage: z.string().max(2000).nullable().optional(),
  autoRoleIds: z.array(z.string()).optional(),
  antiSpam: z.boolean().optional(),
  antiRaid: z.boolean().optional(),
  antiMention: z.boolean().optional(),
  antiLink: z.boolean().optional(),
  antiInvite: z.boolean().optional(),
  antiScam: z.boolean().optional(),
  antiPhishing: z.boolean().optional(),
  antiTokenGrabber: z.boolean().optional(),
  captchaVerification: z.boolean().optional(),
  levelingEnabled: z.boolean().optional(),
  economyEnabled: z.boolean().optional(),
  ticketsEnabled: z.boolean().optional(),
  musicEnabled: z.boolean().optional(),
  aiAssistantEnabled: z.boolean().optional(),
});

export async function listGuilds(req: Request, res: Response) {
  const isAdmin = req.user!.role === "ADMIN" || req.user!.role === "OWNER";

  const guilds = await prisma.guild.findMany({
    where: isAdmin ? {} : { staff: { some: { userId: req.user!.sub } } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      iconUrl: true,
      memberCount: true,
      premiumTier: true,
      isBlacklisted: true,
      installedAt: true,
    },
  });
  res.status(200).json({ guilds });
}

export async function getGuild(req: Request, res: Response) {
  const guild = await prisma.guild.findUnique({
    where: { id: req.params.id },
    include: { settings: true },
  });
  if (!guild) throw ApiError.notFound("Guild not found");
  res.status(200).json({ guild });
}

export async function updateGuildSettings(req: Request, res: Response) {
  const guildId = req.params.id;
  const data = guildSettingsUpdateSchema.parse(req.body);

  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) throw ApiError.notFound("Guild not found");

  const settings = await prisma.guildSettings.upsert({
    where: { guildId },
    create: { guildId, ...data },
    update: data,
  });

  await writeAuditLog({
    guildId,
    actorId: req.user!.sub,
    action: "guild.settings.update",
    metadata: data,
    req,
  });

  res.status(200).json({ settings });
}

export async function listGuildMembers(req: Request, res: Response) {
  const guildId = req.params.id;
  const query = paginationQuerySchema.parse(req.query);

  const [items, total] = await Promise.all([
    prisma.guildMember.findMany({
      where: { guildId },
      orderBy: { joinedAt: "desc" },
      ...skipTake(query),
    }),
    prisma.guildMember.count({ where: { guildId } }),
  ]);

  res.status(200).json(paginate(items, total, query));
}

export async function listGuildStaff(req: Request, res: Response) {
  const guildId = req.params.id;
  const staff = await prisma.guildStaff.findMany({
    where: { guildId },
    include: { user: { select: { id: true, username: true, avatarUrl: true, discordId: true } } },
    orderBy: { addedAt: "asc" },
  });
  res.status(200).json({ staff });
}
