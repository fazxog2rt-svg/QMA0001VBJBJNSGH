import { Router } from "express";
import { requireAuth, requireGuildStaff } from "../../middleware/auth";
import { asyncHandler } from "../../lib/asyncHandler";
import * as controller from "./controller";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /guilds/{id}/analytics/growth:
 *   get:
 *     summary: Guild growth (member/message/command counts over time)
 *     tags: [Analytics]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/:id/analytics/growth", requireGuildStaff, asyncHandler(controller.getGrowth));

/**
 * @openapi
 * /guilds/{id}/analytics/commands:
 *   get:
 *     summary: Command usage analytics over time
 *     tags: [Analytics]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/:id/analytics/commands", requireGuildStaff, asyncHandler(controller.getCommandAnalytics));

/**
 * @openapi
 * /guilds/{id}/analytics/voice-activity:
 *   get:
 *     summary: Voice channel activity analytics over time
 *     tags: [Analytics]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/:id/analytics/voice-activity", requireGuildStaff, asyncHandler(controller.getVoiceActivity));

/**
 * @openapi
 * /guilds/{id}/analytics/realtime-summary:
 *   get:
 *     summary: Live dashboard home cards (member count, open tickets, bot ping/cpu/ram)
 *     tags: [Analytics]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/:id/analytics/realtime-summary", requireGuildStaff, asyncHandler(controller.getRealtimeSummary));

export default router;
