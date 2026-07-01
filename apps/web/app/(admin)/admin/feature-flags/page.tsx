"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Flag, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import type { FeatureFlag } from "@/types";

interface FlagForm {
  key: string;
  description?: string;
  rolloutPercent: number;
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = React.useState<FeatureFlag[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const { register, handleSubmit, reset } = useForm<FlagForm>({ defaultValues: { rolloutPercent: 100 } });

  const load = React.useCallback(() => {
    setLoading(true);
    apiGet<FeatureFlag[]>("/admin/feature-flags")
      .then(setFlags)
      .catch(() => setFlags([]))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(values: FlagForm) {
    setSubmitting(true);
    try {
      const flag = await apiPost<FeatureFlag>("/admin/feature-flags", { ...values, enabled: false });
      setFlags((prev) => [flag, ...prev]);
      toast.success("Feature flag created");
      setDialogOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create flag");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggle(flag: FeatureFlag, enabled: boolean) {
    setFlags((prev) => prev.map((f) => (f.key === flag.key ? { ...f, enabled } : f)));
    try {
      await apiPatch(`/admin/feature-flags/${flag.key}`, { enabled });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update flag");
      load();
    }
  }

  return (
    <Card glass>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flag className="h-4 w-4" /> Feature flags
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" size="sm">
              <Plus className="h-4 w-4" /> New flag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create feature flag</DialogTitle>
              <DialogDescription>Gate a feature behind a rollout percentage.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="key">Key</Label>
                <Input id="key" placeholder="new-dashboard-ui" {...register("key", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Input id="description" {...register("description")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rolloutPercent">Rollout %</Label>
                <Input id="rolloutPercent" type="number" min={0} max={100} {...register("rolloutPercent", { valueAsNumber: true })} />
              </div>
              <DialogFooter>
                <Button type="submit" variant="gradient" loading={submitting}>
                  Create flag
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
        ) : flags.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No feature flags yet.</p>
        ) : (
          flags.map((flag) => (
            <div key={flag.key} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <p className="font-mono text-sm font-medium">{flag.key}</p>
                <p className="text-xs text-muted-foreground">
                  {flag.description ?? "No description"} · {flag.rolloutPercent}% rollout
                </p>
              </div>
              <Switch checked={flag.enabled} onCheckedChange={(v) => toggle(flag, v)} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
