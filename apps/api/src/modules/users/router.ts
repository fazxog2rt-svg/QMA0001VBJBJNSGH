import { Router } from "express";
import { apiKeyCreateSchema } from "@nexusbot/shared";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import * as controller from "./controller";
import { updateMeSchema } from "./controller";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /users/me:
 *   get:
 *     summary: Get the current user's profile
 *     tags: [Users]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/me", asyncHandler(controller.getMe));

/**
 * @openapi
 * /users/me:
 *   patch:
 *     summary: Update the current user's profile
 *     tags: [Users]
 *     security: [{ cookieAuth: [] }]
 */
router.patch("/me", validate({ body: updateMeSchema }), asyncHandler(controller.updateMe));

/**
 * @openapi
 * /users/me/api-keys:
 *   get:
 *     summary: List the current user's API keys
 *     tags: [Users]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/me/api-keys", asyncHandler(controller.listApiKeys));

/**
 * @openapi
 * /users/me/api-keys:
 *   post:
 *     summary: Create a new API key (plaintext shown once)
 *     tags: [Users]
 *     security: [{ cookieAuth: [] }]
 */
router.post("/me/api-keys", validate({ body: apiKeyCreateSchema }), asyncHandler(controller.createApiKey));

/**
 * @openapi
 * /users/me/api-keys/{id}:
 *   delete:
 *     summary: Revoke an API key
 *     tags: [Users]
 *     security: [{ cookieAuth: [] }]
 */
router.delete("/me/api-keys/:id", asyncHandler(controller.revokeApiKey));

export default router;
