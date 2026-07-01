import { Router } from "express";
import { apiKeyAuth } from "../../middleware/apiKeyAuth";
import { validate } from "../../middleware/validate";
import { paginationQuerySchema } from "../../lib/pagination";
import { asyncHandler } from "../../lib/asyncHandler";
import * as controller from "./controller";

const router = Router();

router.use(apiKeyAuth);

/**
 * @openapi
 * /public/bot/stats:
 *   get:
 *     summary: Get live bot stats (developer API)
 *     tags: [Public]
 *     security: [{ bearerAuth: [] }]
 */
router.get("/bot/stats", asyncHandler(controller.getBotStats));

/**
 * @openapi
 * /public/guilds/{id}:
 *   get:
 *     summary: Get basic public guild info (developer API)
 *     tags: [Public]
 *     security: [{ bearerAuth: [] }]
 */
router.get("/guilds/:id", asyncHandler(controller.getGuildInfo));

/**
 * @openapi
 * /public/guilds/{id}/leaderboard:
 *   get:
 *     summary: Get the XP leaderboard for a guild (developer API)
 *     tags: [Public]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/guilds/:id/leaderboard",
  validate({ query: paginationQuerySchema }),
  asyncHandler(controller.getLeaderboard),
);

export default router;
