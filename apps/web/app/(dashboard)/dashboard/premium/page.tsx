"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, Gift, KeyRound, Receipt, Sparkles } from "lucide-react";
import { PREMIUM_LIMITS } from "@nexusbot/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PremiumBadge } from "@/components/dashboard/premium-badge";
import { premiumPlans } from "@/lib/demo-data";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import type { Invoice, Subscription } from "@/types";

export default function PremiumPage() {
  const [subscription, setSubscription] = React.useState<Subscription | null>(null);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [redeeming, setRedeeming] = React.useState(false);
  const [applyingCoupon, setApplyingCoupon] = React.useState(false);

  const { register: registerLicense, handleSubmit: handleLicenseSubmit, reset: resetLicense } = useForm<{ code: string }>();
  const { register: registerCoupon, handleSubmit: handleCouponSubmit, reset: resetCoupon } = useForm<{ code: string }>();

  React.useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      apiGet<Subscription>("/premium/subscription", undefined, controller.signal),
      apiGet<Invoice[]>("/premium/invoices", undefined, controller.signal),
    ])
      .then(([sub, inv]) => {
        setSubscription(sub);
        setInvoices(inv);
      })
      .catch(() => {
        /* likely FREE / no subscription yet; render empty states */
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  async function redeemLicense(values: { code: string }) {
    setRedeeming(true);
    try {
      const sub = await apiPost<Subscription>("/premium/redeem-license", { code: values.code });
      setSubscription(sub);
      toast.success("License redeemed! Your premium tier has been upgraded.");
      resetLicense();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Invalid or expired license key");
    } finally {
      setRedeeming(false);
    }
  }

  async function redeemCoupon(values: { code: string }) {
    setApplyingCoupon(true);
    try {
      await apiPost("/premium/redeem-coupon", { code: values.code });
      toast.success("Coupon applied to your account");
      resetCoupon();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Invalid or expired coupon");
    } finally {
      setApplyingCoupon(false);
    }
  }

  const currentTier = subscription?.tier ?? "FREE";

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Premium</h1>
          <p className="text-sm text-muted-foreground">Compare plans, redeem licenses, and view billing history.</p>
        </div>
        {loading ? <Skeleton className="h-6 w-24" /> : <PremiumBadge tier={currentTier} className="w-fit text-sm" />}
      </div>

      {/* Plan comparison */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {premiumPlans.map((plan) => {
          const limits = PREMIUM_LIMITS[plan.tier];
          const isCurrent = plan.tier === currentTier;
          return (
            <Card
              key={plan.tier}
              glass
              className={cn(
                "relative flex flex-col overflow-hidden",
                plan.highlight && "border-primary/60 shadow-xl shadow-primary/10",
              )}
            >
              {plan.highlight && (
                <div className="absolute right-3 top-3">
                  <Badge variant="gradient">Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>{plan.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div>
                  {plan.priceMonthly === null ? (
                    <p className="text-2xl font-black">One-time</p>
                  ) : plan.priceMonthly === 0 ? (
                    <p className="text-2xl font-black">Free</p>
                  ) : (
                    <p className="text-2xl font-black">
                      ${plan.priceMonthly}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </p>
                  )}
                </div>
                <ul className="flex-1 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-success" /> {limits.maxAutoModRules} AutoMod rules
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-success" /> {limits.maxReactionRoles} reaction roles
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-success" /> {limits.aiRequestsPerDay} AI requests/day
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-success" /> {limits.identityCardThemes} identity card themes
                  </li>
                </ul>
                {isCurrent ? (
                  <Button variant="secondary" disabled className="w-full">
                    Current plan
                  </Button>
                ) : (
                  <Button variant={plan.highlight ? "gradient" : "outline"} className="w-full" asChild>
                    {/* TODO(payments): wire to Stripe Checkout once apps/api exposes a
                        /premium/checkout session endpoint. For now this links out to
                        the marketing pricing page as a placeholder CTA. */}
                    <a href="#" onClick={(e) => e.preventDefault()}>
                      <Sparkles className="h-4 w-4" /> Upgrade
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card glass>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" /> Redeem license key
            </CardTitle>
            <CardDescription>Have a license key? Redeem it to upgrade your account instantly.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLicenseSubmit(redeemLicense)} className="flex gap-2">
              <Input placeholder="NXB-XXXX-XXXX-XXXX" {...registerLicense("code", { required: true })} />
              <Button type="submit" variant="gradient" loading={redeeming}>
                Redeem
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="h-4 w-4" /> Apply coupon
            </CardTitle>
            <CardDescription>Apply a discount coupon to your next invoice.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCouponSubmit(redeemCoupon)} className="flex gap-2">
              <Input placeholder="SAVE20" {...registerCoupon("code", { required: true })} />
              <Button type="submit" variant="secondary" loading={applyingCoupon}>
                Apply
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card glass>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4" /> Invoice history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{format(new Date(inv.createdAt), "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(inv.amountCents / 100, "$")} {inv.currency.toUpperCase()}
                    </TableCell>
                    <TableCell className="capitalize">{inv.provider}</TableCell>
                    <TableCell>
                      <Badge variant={inv.status === "paid" ? "success" : inv.status === "failed" ? "destructive" : "warning"}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
