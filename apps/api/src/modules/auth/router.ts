import { Router } from "express";
import { emailLoginSchema, emailRegisterSchema } from "@nexusbot/shared";
import { validate } from "../../middleware/validate";
import { requireAuth } from "../../middleware/auth";
import { authRateLimiter, sensitiveAuthRateLimiter } from "../../middleware/rateLimit";
import * as controller from "./controller";
import { asyncHandler } from "../../lib/asyncHandler";

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new account with email + password
 *     tags: [Auth]
 */
router.post("/register", authRateLimiter, validate({ body: emailRegisterSchema }), asyncHandler(controller.register));

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login with email + password (+ optional TOTP code)
 *     tags: [Auth]
 */
router.post("/login", authRateLimiter, validate({ body: emailLoginSchema }), asyncHandler(controller.login));

/**
 * @openapi
 * /auth/discord:
 *   get:
 *     summary: Redirect to Discord OAuth2 authorize URL
 *     tags: [Auth]
 */
router.get("/discord", authRateLimiter, controller.discordAuthorize);
router.get("/discord/callback", authRateLimiter, asyncHandler(controller.discordCallback));

/**
 * @openapi
 * /auth/google:
 *   get:
 *     summary: Redirect to Google OAuth2 authorize URL
 *     tags: [Auth]
 */
router.get("/google", authRateLimiter, controller.googleAuthorize);
router.get("/google/callback", authRateLimiter, asyncHandler(controller.googleCallback));

/**
 * @openapi
 * /auth/2fa/setup:
 *   post:
 *     summary: Generate a TOTP secret + QR code for enabling 2FA
 *     tags: [Auth]
 *     security: [{ cookieAuth: [] }]
 */
router.post("/2fa/setup", requireAuth, asyncHandler(controller.setup2fa));

/**
 * @openapi
 * /auth/2fa/verify:
 *   post:
 *     summary: Confirm a TOTP code and enable 2FA, returning backup codes
 *     tags: [Auth]
 *     security: [{ cookieAuth: [] }]
 */
router.post("/2fa/verify", requireAuth, sensitiveAuthRateLimiter, asyncHandler(controller.verify2fa));

/**
 * @openapi
 * /auth/2fa/disable:
 *   post:
 *     summary: Disable 2FA (requires a valid current TOTP code)
 *     tags: [Auth]
 *     security: [{ cookieAuth: [] }]
 */
router.post("/2fa/disable", requireAuth, sensitiveAuthRateLimiter, asyncHandler(controller.disable2fa));

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Rotate the refresh token and mint a new access token
 *     tags: [Auth]
 */
router.post("/refresh", authRateLimiter, asyncHandler(controller.refresh));

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Revoke the current session and clear auth cookies
 *     tags: [Auth]
 *     security: [{ cookieAuth: [] }]
 */
router.post("/logout", requireAuth, asyncHandler(controller.logout));

/**
 * @openapi
 * /auth/sessions:
 *   get:
 *     summary: List active sessions for the current user
 *     tags: [Auth]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/sessions", requireAuth, asyncHandler(controller.listSessions));

/**
 * @openapi
 * /auth/sessions/{id}:
 *   delete:
 *     summary: Revoke a specific session by id
 *     tags: [Auth]
 *     security: [{ cookieAuth: [] }]
 */
router.delete("/sessions/:id", requireAuth, asyncHandler(controller.revokeSessionById));

export default router;
