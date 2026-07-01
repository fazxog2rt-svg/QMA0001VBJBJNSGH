import { Router } from "express";
import { requireAuth, requireGuildStaff } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { paginationQuerySchema } from "../../lib/pagination";
import { asyncHandler } from "../../lib/asyncHandler";
import * as controller from "./controller";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /guilds/{id}/leveling/leaderboard:
 *   get:
 *     summary: Get the XP/leveling leaderboard for a guild
 *     tags: [Leveling]
 *     security: [{ cookieAuth: [] }]
 */
router.get(
  "/:id/leveling/leaderboard",
  requireGuildStaff,
  validate({ query: paginationQuerySchema }),
  asyncHandler(controller.getLevelingLeaderboard),
);

export default router;
