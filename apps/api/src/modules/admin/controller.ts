import type { Request, Response } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@nexusbot/database";
import { ApiError } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../middleware/auditLog";
import { paginate, paginationQuerySchema, skipTake } from "../../lib/pagination";

// ── Users ──────────────────────────────────────────────────────────────────

export const adminUsersQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
});

export async function listUsers(req: Request, res: Response) {
  const query = adminUsersQuerySchema.parse(req.query);
  const where = query.search
    ? {
        OR: [
          { username: { contains: query.search, mode: "insensitive" as const } },
          { email: { contains: query.search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isBlacklisted: true,
        twoFactorEnabled: true,
        createdAt: true,
        lastLoginAt: true,
      },
      ...skipTake(query),
    }),
    prisma.user.count({ where }),
  ]);

  res.status(200).json(paginate(items, total, query));
}

export const adminUserUpdateSchema = z.object({
  role: z.enum(["USER", "MODERATOR", "ADMIN", "OWNER"]).optional(),
  isBlacklisted: z.boolean().optional(),
  blacklistReason: z.string().max(500).nullable().optional(),
});

export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const data = adminUserUpdateSchema.parse(req.body);

  const user = await prisma.user.update({ where: { id }, data });
  await writeAuditLog({ actorId: req.user!.sub, action: "admin.user.update", target: id, metadata: data, req });

  res.status(200).json({ user: { ...user, passwordHash: undefined, twoFactorSecret: undefined } });
}

// ── Guilds ─────────────────────────────────────────────────────────────────

export const adminGuildsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
});

export async function listGuilds(req: Request, res: Response) {
  const query = adminGuildsQuerySchema.parse(req.query);
  const where = query.search ? { name: { contains: query.search, mode: "insensitive" as const } } : {};

  const [items, total] = await Promise.all([
    prisma.guild.findMany({ where, orderBy: { installedAt: "desc" }, ...skipTake(query) }),
    prisma.guild.count({ where }),
  ]);

  res.status(200).json(paginate(items, total, query));
}

export const adminGuildUpdateSchema = z.object({
  isBlacklisted: z.boolean().optional(),
  premiumTier: z.enum(["FREE", "PREMIUM", "PREMIUM_PLUS", "ENTERPRISE", "LIFETIME"]).optional(),
});

export async function updateGuild(req: Request, res: Response) {
  const { id } = req.params;
  const data = adminGuildUpdateSchema.parse(req.body);

  const guild = await prisma.guild.update({ where: { id }, data });
  await writeAuditLog({ guildId: id, actorId: req.user!.sub, action: "admin.guild.update", metadata: data, req });

  res.status(200).json({ guild });
}

// ── Announcements ────────────────────────────────────────────────────────

export const announcementCreateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10_000),
  type: z.enum(["announcement", "news", "changelog"]).default("announcement"),
  version: z.string().max(32).optional(),
  published: z.boolean().default(true),
});

export async function createAnnouncement(req: Request, res: Response) {
  const data = announcementCreateSchema.parse(req.body);
  const announcement = await prisma.announcement.create({ data });
  await writeAuditLog({ actorId: req.user!.sub, action: "admin.announcement.create", target: announcement.id, req });
  res.status(201).json({ announcement });
}

// ── Audit logs ───────────────────────────────────────────────────────────

export const auditLogsQuerySchema = paginationQuerySchema.extend({
  guildId: z.string().optional(),
  actorId: z.string().optional(),
});

export async function listAuditLogs(req: Request, res: Response) {
  const query = auditLogsQuerySchema.parse(req.query);
  const where = {
    ...(query.guildId ? { guildId: query.guildId } : {}),
    ...(query.actorId ? { actorId: query.actorId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, ...skipTake(query) }),
    prisma.auditLog.count({ where }),
  ]);

  res.status(200).json(paginate(items, total, query));
}

// ── Feature flags ────────────────────────────────────────────────────────

export async function listFeatureFlags(req: Request, res: Response) {
  const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  res.status(200).json({ flags });
}

export const featureFlagUpsertSchema = z.object({
  key: z.string().min(1).max(64),
  enabled: z.boolean().default(false),
  rolloutPercent: z.number().int().min(0).max(100).default(100),
  description: z.string().max(280).optional(),
});

export async function upsertFeatureFlag(req: Request, res: Response) {
  const data = featureFlagUpsertSchema.parse(req.body);
  const flag = await prisma.featureFlag.upsert({
    where: { key: data.key },
    create: data,
    update: data,
  });
  await writeAuditLog({ actorId: req.user!.sub, action: "admin.feature_flag.upsert", target: data.key, metadata: data, req });
  res.status(200).json({ flag });
}

// ── Maintenance mode ─────────────────────────────────────────────────────

export async function getMaintenanceMode(req: Request, res: Response) {
  const mode = await prisma.maintenanceMode.findUnique({ where: { id: 1 } });
  res.status(200).json({ maintenanceMode: mode ?? { id: 1, enabled: false, message: null } });
}

export const maintenanceModeUpdateSchema = z.object({
  enabled: z.boolean(),
  message: z.string().max(500).nullable().optional(),
});

export async function setMaintenanceMode(req: Request, res: Response) {
  const data = maintenanceModeUpdateSchema.parse(req.body);
  const mode = await prisma.maintenanceMode.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  await writeAuditLog({ actorId: req.user!.sub, action: "admin.maintenance_mode.update", metadata: data, req });
  res.status(200).json({ maintenanceMode: mode });
}

// ── License keys ─────────────────────────────────────────────────────────

export const licenseKeyCreateSchema = z.object({
  tier: z.enum(["FREE", "PREMIUM", "PREMIUM_PLUS", "ENTERPRISE", "LIFETIME"]),
  durationDays: z.number().int().positive(),
  expiresAt: z.string().datetime().optional(),
});

export async function createLicenseKey(req: Request, res: Response) {
  const data = licenseKeyCreateSchema.parse(req.body);
  const code = `NXB-${nanoid(16).toUpperCase()}`;

  const license = await prisma.licenseKey.create({
    data: {
      code,
      tier: data.tier,
      durationDays: data.durationDays,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    },
  });

  await writeAuditLog({ actorId: req.user!.sub, action: "admin.license_key.create", target: license.id, req });
  res.status(201).json({ license });
}

// ── Coupons ──────────────────────────────────────────────────────────────

export const couponCreateSchema = z.object({
  discountPercent: z.number().int().min(1).max(100),
  maxRedemptions: z.number().int().positive().default(1),
  expiresAt: z.string().datetime().optional(),
});

export async function createCoupon(req: Request, res: Response) {
  const data = couponCreateSchema.parse(req.body);
  const code = `NXB-${nanoid(10).toUpperCase()}`;

  const coupon = await prisma.coupon.create({
    data: {
      code,
      discountPercent: data.discountPercent,
      maxRedemptions: data.maxRedemptions,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    },
  });

  await writeAuditLog({ actorId: req.user!.sub, action: "admin.coupon.create", target: coupon.id, req });
  res.status(201).json({ coupon });
}

// ── Platform stats ───────────────────────────────────────────────────────

export async function getPlatformStats(req: Request, res: Response) {
  const [userCount, guildCount, activeSubscriptions, openTickets, moderationCases24h] = await Promise.all([
    prisma.user.count(),
    prisma.guild.count({ where: { leftAt: null } }),
    prisma.subscription.count({ where: { status: "active" } }),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "PENDING"] } } }),
    prisma.moderationCase.count({ where: { createdAt: { gte: new Date(Date.now() - 86_400_000) } } }),
  ]);

  res.status(200).json({
    userCount,
    guildCount,
    activeSubscriptions,
    openTickets,
    moderationCases24h,
  });
}

// ── Read-only DB viewer (allowlisted models only) ───────────────────────

const DB_VIEWER_ALLOWLIST: Record<string, () => Promise<unknown[]>> = {
  featureFlag: () => prisma.featureFlag.findMany({ take: 200 }),
  announcement: () => prisma.announcement.findMany({ take: 200, orderBy: { createdAt: "desc" } }),
  licenseKey: () => prisma.licenseKey.findMany({ take: 200, orderBy: { createdAt: "desc" } }),
  coupon: () => prisma.coupon.findMany({ take: 200, orderBy: { createdAt: "desc" } }),
  auditLog: () => prisma.auditLog.findMany({ take: 200, orderBy: { createdAt: "desc" } }),
  guild: () => prisma.guild.findMany({ take: 200, orderBy: { installedAt: "desc" } }),
};

export async function readDbModel(req: Request, res: Response) {
  const { model } = req.params;
  const reader = DB_VIEWER_ALLOWLIST[model];
  if (!reader) {
    throw ApiError.badRequest(
      `Model "${model}" is not exposed via the DB viewer. Allowed: ${Object.keys(DB_VIEWER_ALLOWLIST).join(", ")}`,
    );
  }
  const rows = await reader();
  res.status(200).json({ model, rows });
}
