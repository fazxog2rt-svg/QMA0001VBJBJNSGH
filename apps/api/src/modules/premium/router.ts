import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import * as controller from "./controller";
import { redeemCouponSchema, redeemLicenseSchema } from "./controller";

const router = Router();

/**
 * @openapi
 * /premium/plans:
 *   get:
 *     summary: List premium plan tiers and their limits/pricing
 *     tags: [Premium]
 */
router.get("/plans", controller.getPlans);

/**
 * @openapi
 * /premium/subscription:
 *   get:
 *     summary: Get the current user's subscription
 *     tags: [Premium]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/subscription", requireAuth, asyncHandler(controller.getSubscription));

/**
 * @openapi
 * /premium/redeem-license:
 *   post:
 *     summary: Redeem a license key to activate/extend a subscription
 *     tags: [Premium]
 *     security: [{ cookieAuth: [] }]
 */
router.post(
  "/redeem-license",
  requireAuth,
  validate({ body: redeemLicenseSchema }),
  asyncHandler(controller.redeemLicense),
);

/**
 * @openapi
 * /premium/redeem-coupon:
 *   post:
 *     summary: Validate + reserve a discount coupon
 *     tags: [Premium]
 *     security: [{ cookieAuth: [] }]
 */
router.post(
  "/redeem-coupon",
  requireAuth,
  validate({ body: redeemCouponSchema }),
  asyncHandler(controller.redeemCoupon),
);

/**
 * @openapi
 * /premium/invoices:
 *   get:
 *     summary: List the current user's invoices
 *     tags: [Premium]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/invoices", requireAuth, asyncHandler(controller.listInvoices));

/**
 * @openapi
 * /premium/webhook/payment:
 *   post:
 *     summary: Payment provider webhook (Stripe/PayPal) — STUB, see controller comment
 *     tags: [Premium]
 */
router.post("/webhook/payment", asyncHandler(controller.paymentWebhookStub));

export default router;
