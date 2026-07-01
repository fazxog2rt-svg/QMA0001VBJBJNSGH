"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiGet, apiPatch, ApiError } from "@/lib/api";
import type { MaintenanceMode } from "@/types";

export default function MaintenanceModePage() {
  const [state, setState] = React.useState<MaintenanceMode | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    const controller = new AbortController();
    apiGet<MaintenanceMode>("/admin/maintenance-mode", undefined, controller.signal)
      .then((data) => {
        setState(data);
        setMessage(data.message ?? "");
      })
      .catch(() => setState({ enabled: false, message: "" }))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  async function toggle(enabled: boolean) {
    if (!state) return;
    setState({ ...state, enabled });
    try {
      await apiPatch("/admin/maintenance-mode", { enabled, message });
      toast.success(enabled ? "Maintenance mode enabled" : "Maintenance mode disabled");
    } catch (err) {
      setState((s) => (s ? { ...s, enabled: !enabled } : s));
      toast.error(err instanceof ApiError ? err.message : "Failed to update maintenance mode");
    }
  }

  async function saveMessage() {
    setSaving(true);
    try {
      await apiPatch("/admin/maintenance-mode", { enabled: state?.enabled ?? false, message });
      toast.success("Maintenance message saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save message");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !state) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card glass>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4" /> Maintenance mode
        </CardTitle>
        <CardDescription>Temporarily disable dashboard access for non-admin users.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
          <div>
            <p className="text-sm font-medium">Maintenance mode</p>
            <p className="text-xs text-muted-foreground">
              When enabled, non-admin dashboard users see the maintenance message below.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={state.enabled ? "destructive" : "success"}>{state.enabled ? "Active" : "Inactive"}</Badge>
            <Switch checked={state.enabled} onCheckedChange={toggle} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Maintenance message</label>
          <Textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="We're performing scheduled maintenance. We'll be back shortly!"
          />
        </div>

        <Button variant="gradient" onClick={saveMessage} loading={saving}>
          <Save className="h-4 w-4" /> Save message
        </Button>
      </CardContent>
    </Card>
  );
}
