import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import * as controller from "./controller";
import { webhookCreateSchema, webhookUpdateSchema } from "./controller";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /webhooks:
 *   get:
 *     summary: List webhooks owned by the caller
 *     tags: [Webhooks]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/", asyncHandler(controller.listWebhooks));

/**
 * @openapi
 * /webhooks:
 *   post:
 *     summary: Create a webhook (secret shown once)
 *     tags: [Webhooks]
 *     security: [{ cookieAuth: [] }]
 */
router.post("/", validate({ body: webhookCreateSchema }), asyncHandler(controller.createWebhook));

/**
 * @openapi
 * /webhooks/{id}:
 *   patch:
 *     summary: Update a webhook
 *     tags: [Webhooks]
 *     security: [{ cookieAuth: [] }]
 */
router.patch("/:id", validate({ body: webhookUpdateSchema }), asyncHandler(controller.updateWebhook));

/**
 * @openapi
 * /webhooks/{id}:
 *   delete:
 *     summary: Delete a webhook
 *     tags: [Webhooks]
 *     security: [{ cookieAuth: [] }]
 */
router.delete("/:id", asyncHandler(controller.deleteWebhook));

export default router;
