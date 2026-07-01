import { Router } from "express";
import { requireAuth, requireGuildAdmin, requireGuildStaff } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { paginationQuerySchema } from "../../lib/pagination";
import { asyncHandler } from "../../lib/asyncHandler";
import * as controller from "./controller";
import { guildSettingsUpdateSchema } from "./controller";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /guilds:
 *   get:
 *     summary: List guilds the caller is staff of (ADMIN/OWNER sees all)
 *     tags: [Guilds]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/", asyncHandler(controller.listGuilds));

/**
 * @openapi
 * /guilds/{id}:
 *   get:
 *     summary: Get a guild's profile + settings
 *     tags: [Guilds]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/:id", requireGuildStaff, asyncHandler(controller.getGuild));

/**
 * @openapi
 * /guilds/{id}/settings:
 *   patch:
 *     summary: Update a guild's settings
 *     tags: [Guilds]
 *     security: [{ cookieAuth: [] }]
 */
router.patch(
  "/:id/settings",
  requireGuildAdmin,
  validate({ body: guildSettingsUpdateSchema }),
  asyncHandler(controller.updateGuildSettings),
);

/**
 * @openapi
 * /guilds/{id}/members:
 *   get:
 *     summary: List guild members (paginated)
 *     tags: [Guilds]
 *     security: [{ cookieAuth: [] }]
 */
router.get(
  "/:id/members",
  requireGuildStaff,
  validate({ query: paginationQuerySchema }),
  asyncHandler(controller.listGuildMembers),
);

/**
 * @openapi
 * /guilds/{id}/staff:
 *   get:
 *     summary: List guild staff members
 *     tags: [Guilds]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/:id/staff", requireGuildStaff, asyncHandler(controller.listGuildStaff));

export default router;
