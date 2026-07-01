"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Trash2, Webhook as WebhookIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import type { Webhook } from "@/types";

interface WebhookForm {
  url: string;
  events: string;
}

export default function GuildWebhooksPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [webhooks, setWebhooks] = React.useState<Webhook[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const { register, handleSubmit, reset } = useForm<WebhookForm>();

  const load = React.useCallback(() => {
    setLoading(true);
    apiGet<Webhook[]>(`/guilds/${guildId}/webhooks`)
      .then(setWebhooks)
      .catch(() => setWebhooks([]))
      .finally(() => setLoading(false));
  }, [guildId]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(values: WebhookForm) {
    setSubmitting(true);
    try {
      await apiPost(`/guilds/${guildId}/webhooks`, {
        url: values.url,
        events: values.events.split(",").map((e) => e.trim()).filter(Boolean),
      });
      toast.success("Webhook created");
      setDialogOpen(false);
      reset();
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create webhook");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleEnabled(webhook: Webhook, enabled: boolean) {
    setWebhooks((prev) => prev.map((w) => (w.id === webhook.id ? { ...w, enabled } : w)));
    try {
      await apiPatch(`/guilds/${guildId}/webhooks/${webhook.id}`, { enabled });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update webhook");
      load();
    }
  }

  async function remove(webhook: Webhook) {
    try {
      await apiDelete(`/guilds/${guildId}/webhooks/${webhook.id}`);
      toast.success("Webhook removed");
      setWebhooks((prev) => prev.filter((w) => w.id !== webhook.id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove webhook");
    }
  }

  return (
    <Card glass>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <WebhookIcon className="h-4 w-4" /> Webhooks
          </CardTitle>
          <CardDescription>Send realtime event payloads to external URLs.</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" size="sm">
              <Plus className="h-4 w-4" /> New webhook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create webhook</DialogTitle>
              <DialogDescription>Events matching this list will be POSTed to the target URL.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="url">Target URL</Label>
                <Input id="url" type="url" placeholder="https://example.com/webhook" {...register("url", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="events">Events (comma-separated)</Label>
                <Input id="events" placeholder="moderation.ban, ticket.opened" {...register("events", { required: true })} />
              </div>
              <DialogFooter>
                <Button type="submit" variant="gradient" loading={submitting}>
                  Create webhook
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : webhooks.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No webhooks configured yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell className="max-w-[220px] truncate font-mono text-xs">{webhook.url}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.slice(0, 3).map((e) => (
                        <Badge key={e} variant="outline" className="text-[10px]">
                          {e}
                        </Badge>
                      ))}
                      {webhook.events.length > 3 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{webhook.events.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch checked={webhook.enabled} onCheckedChange={(v) => toggleEnabled(webhook, v)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => remove(webhook)} aria-label="Delete webhook">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
