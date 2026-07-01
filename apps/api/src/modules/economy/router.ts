import { Router } from "express";
import { requireAuth, requireGuildAdmin, requireGuildStaff } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { paginationQuerySchema } from "../../lib/pagination";
import { asyncHandler } from "../../lib/asyncHandler";
import * as controller from "./controller";
import { economyAdjustSchema } from "./controller";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /guilds/{id}/economy/leaderboard:
 *   get:
 *     summary: Get the economy leaderboard for a guild
 *     tags: [Economy]
 *     security: [{ cookieAuth: [] }]
 */
router.get(
  "/:id/economy/leaderboard",
  requireGuildStaff,
  validate({ query: paginationQuerySchema }),
  asyncHandler(controller.getLeaderboard),
);

/**
 * @openapi
 * /guilds/{id}/economy/{memberId}:
 *   get:
 *     summary: Get a member's economy profile + recent transactions
 *     tags: [Economy]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/:id/economy/:memberId", requireGuildStaff, asyncHandler(controller.getMemberEconomy));

/**
 * @openapi
 * /guilds/{id}/economy/{memberId}/adjust:
 *   post:
 *     summary: Admin-adjust a member's wallet/bank balance
 *     tags: [Economy]
 *     security: [{ cookieAuth: [] }]
 */
router.post(
  "/:id/economy/:memberId/adjust",
  requireGuildAdmin,
  validate({ body: economyAdjustSchema }),
  asyncHandler(controller.adjustEconomy),
);

export default router;
