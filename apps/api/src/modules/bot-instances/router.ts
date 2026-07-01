import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import * as controller from "./controller";
import { createInstanceSchema } from "./controller";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /bot-instances:
 *   get:
 *     summary: List bot instances (self-hosted bots) owned by the caller
 *     tags: [Bot Instances]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/", asyncHandler(controller.listInstances));

/**
 * @openapi
 * /bot-instances:
 *   post:
 *     summary: Register a new bot instance; returns a one-time agent token
 *     tags: [Bot Instances]
 *     security: [{ cookieAuth: [] }]
 */
router.post("/", validate({ body: createInstanceSchema }), asyncHandler(controller.createInstance));

/**
 * @openapi
 * /bot-instances/{id}:
 *   delete:
 *     summary: Delete a bot instance
 *     tags: [Bot Instances]
 *     security: [{ cookieAuth: [] }]
 */
router.delete("/:id", asyncHandler(controller.deleteInstance));

/**
 * @openapi
 * /bot-instances/{id}/regenerate-token:
 *   post:
 *     summary: Revoke the current agent token and issue a new one
 *     tags: [Bot Instances]
 *     security: [{ cookieAuth: [] }]
 */
router.post("/:id/regenerate-token", asyncHandler(controller.regenerateToken));

/**
 * @openapi
 * /bot-instances/{id}/start:
 *   post:
 *     summary: Ask the connected agent to start the bot process
 *     tags: [Bot Instances]
 *     security: [{ cookieAuth: [] }]
 */
router.post("/:id/start", asyncHandler(controller.startInstance));

/**
 * @openapi
 * /bot-instances/{id}/stop:
 *   post:
 *     summary: Ask the connected agent to stop the bot process
 *     tags: [Bot Instances]
 *     security: [{ cookieAuth: [] }]
 */
router.post("/:id/stop", asyncHandler(controller.stopInstance));

/**
 * @openapi
 * /bot-instances/{id}/restart:
 *   post:
 *     summary: Ask the connected agent to restart the bot process
 *     tags: [Bot Instances]
 *     security: [{ cookieAuth: [] }]
 */
router.post("/:id/restart", asyncHandler(controller.restartInstance));

export default router;
