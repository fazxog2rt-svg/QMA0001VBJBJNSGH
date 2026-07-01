"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { format } from "date-fns";
import { KeyRound, Ticket, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import type { Coupon, LicenseKey, PremiumTier } from "@/types";

interface LicenseForm {
  tier: PremiumTier;
  durationDays: number;
}

interface CouponForm {
  code: string;
  discountPercent: number;
  maxRedemptions: number;
}

export default function AdminPremiumPage() {
  const [licenses, setLicenses] = React.useState<LicenseKey[]>([]);
  const [coupons, setCoupons] = React.useState<Coupon[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [generatingLicense, setGeneratingLicense] = React.useState(false);
  const [generatingCoupon, setGeneratingCoupon] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.all([apiGet<LicenseKey[]>("/admin/premium/licenses"), apiGet<Coupon[]>("/admin/premium/coupons")])
      .then(([l, c]) => {
        setLicenses(l);
        setCoupons(c);
      })
      .catch(() => {
        setLicenses([]);
        setCoupons([]);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const licenseForm = useForm<LicenseForm>({ defaultValues: { tier: "PREMIUM", durationDays: 30 } });
  const couponForm = useForm<CouponForm>({ defaultValues: { discountPercent: 20, maxRedemptions: 100 } });

  async function generateLicense(values: LicenseForm) {
    setGeneratingLicense(true);
    try {
      const key = await apiPost<LicenseKey>("/admin/premium/licenses", values);
      setLicenses((prev) => [key, ...prev]);
      toast.success(`License ${key.code} generated`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to generate license");
    } finally {
      setGeneratingLicense(false);
    }
  }

  async function generateCoupon(values: CouponForm) {
    setGeneratingCoupon(true);
    try {
      const coupon = await apiPost<Coupon>("/admin/premium/coupons", values);
      setCoupons((prev) => [coupon, ...prev]);
      toast.success(`Coupon ${coupon.code} created`);
      couponForm.reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create coupon");
    } finally {
      setGeneratingCoupon(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card glass>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" /> Generate license key
            </CardTitle>
            <CardDescription>Issue a premium license key for manual distribution.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={licenseForm.handleSubmit(generateLicense)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Tier</Label>
                <Controller
                  control={licenseForm.control}
                  name="tier"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["PREMIUM", "PREMIUM_PLUS", "ENTERPRISE", "LIFETIME"] as PremiumTier[]).map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="durationDays">Duration (days)</Label>
                <Input id="durationDays" type="number" {...licenseForm.register("durationDays", { valueAsNumber: true })} />
              </div>
              <Button type="submit" variant="gradient" loading={generatingLicense} className="w-full">
                Generate license
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ticket className="h-4 w-4" /> Create coupon
            </CardTitle>
            <CardDescription>Discount coupons redeemable at checkout.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={couponForm.handleSubmit(generateCoupon)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">Coupon code</Label>
                <Input id="code" placeholder="SAVE20" {...couponForm.register("code", { required: true })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="discountPercent">Discount %</Label>
                  <Input id="discountPercent" type="number" {...couponForm.register("discountPercent", { valueAsNumber: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxRedemptions">Max redemptions</Label>
                  <Input id="maxRedemptions" type="number" {...couponForm.register("maxRedemptions", { valueAsNumber: true })} />
                </div>
              </div>
              <Button type="submit" variant="gradient" loading={generatingCoupon} className="w-full">
                Create coupon
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card glass>
        <CardHeader>
          <CardTitle className="text-base">License keys</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : licenses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No license keys generated yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="flex items-center gap-1.5 font-mono text-xs">
                      {l.code}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(l.code);
                          toast.success("Copied");
                        }}
                        aria-label="Copy code"
                      >
                        <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="gradient">{l.tier}</Badge>
                    </TableCell>
                    <TableCell>{l.durationDays}d</TableCell>
                    <TableCell>
                      <Badge variant={l.redeemedAt ? "secondary" : "success"}>{l.redeemedAt ? "Redeemed" : "Available"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card glass>
        <CardHeader>
          <CardTitle className="text-base">Coupons</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : coupons.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No coupons created yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Redemptions</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell>{c.discountPercent}%</TableCell>
                    <TableCell>
                      {c.redemptions}/{c.maxRedemptions}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.expiresAt ? format(new Date(c.expiresAt), "MMM d, yyyy") : "Never"}
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
