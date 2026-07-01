import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import * as controller from "./controller";
import * as backupController from "./backupController";
import {
  adminGuildUpdateSchema,
  adminGuildsQuerySchema,
  adminUserUpdateSchema,
  adminUsersQuerySchema,
  announcementCreateSchema,
  auditLogsQuerySchema,
  couponCreateSchema,
  featureFlagUpsertSchema,
  licenseKeyCreateSchema,
  maintenanceModeUpdateSchema,
} from "./controller";

const router = Router();
router.use(requireAuth, requireRole("ADMIN", "OWNER"));

/**
 * @openapi
 * /admin/users:
 *   get:
 *     summary: List/search all platform users
 *     tags: [Admin]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/users", validate({ query: adminUsersQuerySchema }), asyncHandler(controller.listUsers));

/**
 * @openapi
 * /admin/users/{id}:
 *   patch:
 *     summary: Update a user's role / blacklist status
 *     tags: [Admin]
 *     security: [{ cookieAuth: [] }]
 */
router.patch("/users/:id", validate({ body: adminUserUpdateSchema }), asyncHandler(controller.updateUser));

/**
 * @openapi
 * /admin/guilds:
 *   get:
 *     summary: List/search all guilds
 *     tags: [Admin]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/guilds", validate({ query: adminGuildsQuerySchema }), asyncHandler(controller.listGuilds));

/**
 * @openapi
 * /admin/guilds/{id}:
 *   patch:
 *     summary: Update a guild (incl. blacklist toggle, premium tier)
 *     tags: [Admin]
 *     security: [{ cookieAuth: [] }]
 */
router.patch("/guilds/:id", validate({ body: adminGuildUpdateSchema }), asyncHandler(controller.updateGuild));

/**
 * @openapi
 * /admin/announcements:
 *   post:
 *     summary: Publish a platform announcement
 *     tags: [Admin]
 *     security: [{ cookieAuth: [] }]
 */
router.post(
  "/announcements",
  validate({ body: announcementCreateSchema }),
  asyncHandler(controller.createAnnouncement),
);

/**
 * @openapi
 * /admin/audit-logs:
 *   get:
 *     summary: List platform-wide audit log entries
 *     tags: [Admin]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/audit-logs", validate({ query: auditLogsQuerySchema }), asyncHandler(controller.listAuditLogs));

/**
 * @openapi
 * /admin/feature-flags:
 *   get:
 *     summary: List feature flags
 *     tags: [Admin]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/feature-flags", asyncHandler(controller.listFeatureFlags));

/**
 * @openapi
 * /admin/feature-flags:
 *   put:
 *     summary: Create or update a feature flag
 *     tags: [Admin]
 *     security: [{ cookieAuth: [] }]
 */
router.put(
  "/feature-flags",
  validate({ body: featureFlagUpsertSchema }),
  asyncHandler(controller.upsertFeatureFlag),
);

/**
 * @openapi
 * /admin/maintenance-mode:
 *   get:
 *     summary: Get maintenance mode status
 *     tags: [Admin]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/maintenance-mode", asyncHandler(controller.getMaintenanceMode));

/**
 * @openapi
 * /admin/maintenance-mode:
 *   put:
 *     summary: Toggle maintenance mode
 *     tags: [Admin]
 *     security: [{ cookieAuth: [] }]
 */
router.put(
  "/maintenance-mode",
  validate({ body: maintenanceModeUpdateSchema }),
  asyncHandler(controller.setMaintenanceMode),
);

/**
 * @openapi
 * /admin/license-keys:
 *   post:
 *     summary: Generate a new license key
 *     tags: [Admin]
 *     security: [{ cookieAuth: [] }]
 */
router.post(
  "/license-keys",
  validate({ body: licenseKeyCreateSchema }),
  asyncHandler(controller.createLicenseKey),
);

/**
 * @openapi
 * /admin/coupons:
 *   post:
 *     summary: Generate a new discount coupon
 *     tags: [Admin]
 *     security: [{ cookieAuth: [] }]
 */
router.post("/coupons", validate({ body: couponCreateSchema }), asyncHandler(controller.createCoupon));

/**
 * @openapi
 * /admin/stats:
 *   get:
 *     summary: Platform-wide aggregate stats
 *     tags: [Admin]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/stats", asyncHandler(controller.getPlatformStats));

/**
 * @openapi
 * /admin/db/{model}:
 *   get:
 *     summary: Read-only view of an allowlisted Prisma model (safe DB viewer)
 *     tags: [Admin]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/db/:model", asyncHandler(controller.readDbModel));

export default router;

/**
 * Guild backup routes live under /guilds/:id/backup* (not /admin/*) per the
 * spec, but still require platform ADMIN/OWNER — mounted separately in
 * app.ts alongside the other /guilds routers.
 */
export const guildBackupRouter = Router();
guildBackupRouter.use(requireAuth, requireRole("ADMIN", "OWNER"));

/**
 * @openapi
 * /guilds/{id}/backup:
 *   post:
 *     summary: Create a JSON snapshot backup of a guild's settings/automod/reaction-roles
 *     tags: [Admin]
 *     security: [{ cookieAuth: [] }]
 */
guildBackupRouter.post("/:id/backup", asyncHandler(backupController.createBackup));

/**
 * @openapi
 * /guilds/{id}/backups:
 *   get:
 *     summary: List backups for a guild
 *     tags: [Admin]
 *     security: [{ cookieAuth: [] }]
 */
guildBackupRouter.get("/:id/backups", asyncHandler(backupController.listBackups));

/**
 * @openapi
 * /guilds/{id}/backups/{backupId}/restore:
 *   post:
 *     summary: Restore a guild from a backup snapshot
 *     tags: [Admin]
 *     security: [{ cookieAuth: [] }]
 */
guildBackupRouter.post("/:id/backups/:backupId/restore", asyncHandler(backupController.restoreBackup));
