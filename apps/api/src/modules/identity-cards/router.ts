import { Router } from "express";
import { identityCardCreateSchema } from "@nexusbot/shared";
import { requireAuth, requireGuildStaff } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { paginationQuerySchema } from "../../lib/pagination";
import { asyncHandler } from "../../lib/asyncHandler";
import * as controller from "./controller";

const router = Router();

/**
 * @openapi
 * /guilds/{id}/identity-cards:
 *   post:
 *     summary: Create an identity card for a guild member
 *     tags: [IdentityCards]
 *     security: [{ cookieAuth: [] }]
 */
router.post(
  "/guilds/:id/identity-cards",
  requireAuth,
  requireGuildStaff,
  validate({ body: identityCardCreateSchema }),
  asyncHandler(controller.createIdentityCard),
);

/**
 * @openapi
 * /guilds/{id}/identity-cards:
 *   get:
 *     summary: List identity cards for a guild
 *     tags: [IdentityCards]
 *     security: [{ cookieAuth: [] }]
 */
router.get(
  "/guilds/:id/identity-cards",
  requireAuth,
  requireGuildStaff,
  validate({ query: paginationQuerySchema }),
  asyncHandler(controller.listIdentityCards),
);

/**
 * @openapi
 * /identity-cards/share/{slug}:
 *   get:
 *     summary: Get a shareable identity card by its public slug (no auth)
 *     tags: [IdentityCards]
 */
router.get("/identity-cards/share/:slug", asyncHandler(controller.getCardByShareSlug));

/**
 * @openapi
 * /identity-cards/{cardId}/verify:
 *   post:
 *     summary: Mark an identity card as staff-verified
 *     tags: [IdentityCards]
 *     security: [{ cookieAuth: [] }]
 */
router.post(
  "/identity-cards/:cardId/verify",
  requireAuth,
  asyncHandler(controller.verifyIdentityCard),
);

export default router;
