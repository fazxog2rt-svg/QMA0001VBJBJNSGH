import { Router } from "express";
import { moderationActionSchema } from "@nexusbot/shared";
import { requireAuth, requireGuildStaff } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import * as controller from "./controller";
import { autoModRuleUpdateSchema, moderationCasesQuerySchema } from "./controller";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /guilds/{id}/moderation/cases:
 *   get:
 *     summary: List moderation cases (paginated, filterable by targetId/action)
 *     tags: [Moderation]
 *     security: [{ cookieAuth: [] }]
 */
router.get(
  "/:id/moderation/cases",
  requireGuildStaff,
  validate({ query: moderationCasesQuerySchema }),
  asyncHandler(controller.listCases),
);

/**
 * @openapi
 * /guilds/{id}/moderation/{action}:
 *   post:
 *     summary: Perform a moderation action (warn/kick/ban/timeout/softban/tempban/unban)
 *     description: Writes a ModerationCase row and publishes a bot-command over Redis for apps/bot to execute against Discord.
 *     tags: [Moderation]
 *     security: [{ cookieAuth: [] }]
 */
router.post(
  "/:id/moderation/:action",
  requireGuildStaff,
  validate({ body: moderationActionSchema }),
  asyncHandler(controller.performAction),
);

/**
 * @openapi
 * /guilds/{id}/automod-rules:
 *   get:
 *     summary: List AutoMod rules for a guild
 *     tags: [Moderation]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/:id/automod-rules", requireGuildStaff, asyncHandler(controller.listAutoModRules));

/**
 * @openapi
 * /guilds/{id}/automod-rules/{ruleId}:
 *   put:
 *     summary: Update an AutoMod rule
 *     tags: [Moderation]
 *     security: [{ cookieAuth: [] }]
 */
router.put(
  "/:id/automod-rules/:ruleId",
  requireGuildStaff,
  validate({ body: autoModRuleUpdateSchema }),
  asyncHandler(controller.updateAutoModRule),
);

export default router;
