import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@nexusbot/database";
import { PREMIUM_LIMITS } from "@nexusbot/shared";
import { ApiError } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../middleware/auditLog";

const PLAN_PRICING_USD_CENTS: Record<string, number> = {
  FREE: 0,
  PREMIUM: 499,
  PREMIUM_PLUS: 999,
  ENTERPRISE: 2999,
  LIFETIME: 14999,
};

export function getPlans(req: Request, res: Response) {
  const plans = Object.entries(PREMIUM_LIMITS).map(([tier, limits]) => ({
    tier,
    priceCents: PLAN_PRICING_USD_CENTS[tier] ?? 0,
    limits,
  }));
  res.status(200).json({ plans });
}

export async function getSubscription(req: Request, res: Response) {
  const subscription = await prisma.subscription.findUnique({ where: { userId: req.user!.sub } });
  res.status(200).json({ subscription });
}

export const redeemLicenseSchema = z.object({ code: z.string().min(1).max(64) });

export async function redeemLicense(req: Request, res: Response) {
  const { code } = redeemLicenseSchema.parse(req.body);

  const license = await prisma.licenseKey.findUnique({ where: { code } });
  if (!license) throw ApiError.notFound("License key not found");
  if (license.redeemedAt) throw ApiError.conflict("License key has already been redeemed");
  if (license.expiresAt && license.expiresAt < new Date()) {
    throw ApiError.conflict("License key has expired");
  }

  const periodEnd = new Date(Date.now() + license.durationDays * 86_400_000);

  const [, subscription] = await prisma.$transaction([
    prisma.licenseKey.update({
      where: { id: license.id },
      data: { redeemedById: req.user!.sub, redeemedAt: new Date() },
    }),
    prisma.subscription.upsert({
      where: { userId: req.user!.sub },
      create: {
        userId: req.user!.sub,
        tier: license.tier,
        status: "active",
        currentPeriodEnd: periodEnd,
      },
      update: { tier: license.tier, status: "active", currentPeriodEnd: periodEnd },
    }),
  ]);

  await writeAuditLog({
    actorId: req.user!.sub,
    action: "premium.license.redeem",
    target: license.id,
    metadata: { tier: license.tier },
    req,
  });

  res.status(200).json({ subscription });
}

export const redeemCouponSchema = z.object({ code: z.string().min(1).max(64) });

export async function redeemCoupon(req: Request, res: Response) {
  const { code } = redeemCouponSchema.parse(req.body);

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) throw ApiError.notFound("Coupon not found");
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw ApiError.conflict("Coupon has expired");
  if (coupon.redemptions >= coupon.maxRedemptions) {
    throw ApiError.conflict("Coupon has reached its redemption limit");
  }

  const updated = await prisma.coupon.update({
    where: { id: coupon.id },
    data: { redemptions: { increment: 1 } },
  });

  await writeAuditLog({
    actorId: req.user!.sub,
    action: "premium.coupon.redeem",
    target: coupon.id,
    metadata: { discountPercent: coupon.discountPercent },
    req,
  });

  // The discount is applied at actual checkout time (handled by the payment
  // provider integration — see paymentWebhook below); this endpoint just
  // validates + reserves a redemption slot.
  res.status(200).json({
    discountPercent: updated.discountPercent,
    redemptionsRemaining: updated.maxRedemptions - updated.redemptions,
  });
}

export async function listInvoices(req: Request, res: Response) {
  const invoices = await prisma.invoice.findMany({
    where: { userId: req.user!.sub },
    orderBy: { createdAt: "desc" },
  });
  res.status(200).json({ invoices });
}

/**
 * Stub for a payment-provider webhook (Stripe/PayPal). In production this
 * route would:
 *   1. Verify the request signature (e.g. Stripe-Signature header + webhook
 *      signing secret via stripe.webhooks.constructEvent) BEFORE trusting
 *      req.body — never process an unverified payload.
 *   2. Look up the relevant Subscription/User by the provider's customer/
 *      subscription id (stored on Subscription at checkout-session-creation
 *      time, not shown here since we don't call the real Stripe API).
 *   3. Upsert Subscription.status/currentPeriodEnd and insert an Invoice row
 *      idempotently, keyed on the provider's event id to avoid double-writes
 *      on webhook retries.
 * This handler intentionally does none of the above yet — it only documents
 * the contract and echoes 200 so a real provider integration has a place to
 * land without touching routing/auth.
 */
export async function paymentWebhookStub(req: Request, res: Response) {
  res.status(200).json({
    received: true,
    note: "Stub endpoint — real signature verification + Invoice/Subscription writes go here.",
  });
}
