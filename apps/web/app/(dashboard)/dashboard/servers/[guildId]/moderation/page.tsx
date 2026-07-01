"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Gavel, Plus, ShieldAlert } from "lucide-react";
import { moderationActionSchema, RealtimeEvent } from "@nexusbot/shared";
import type { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { useRealtime } from "@/hooks/use-realtime";
import type { ModerationAction, ModerationCase } from "@/types";

const ACTIONS: ModerationAction[] = ["WARN", "MUTE", "TIMEOUT", "KICK", "BAN", "SOFTBAN", "TEMPBAN", "JAIL"];

const actionColor: Record<ModerationAction, "destructive" | "warning" | "secondary" | "success"> = {
  WARN: "warning",
  MUTE: "secondary",
  TIMEOUT: "secondary",
  KICK: "destructive",
  BAN: "destructive",
  SOFTBAN: "destructive",
  TEMPBAN: "destructive",
  JAIL: "secondary",
  UNBAN: "success",
  UNMUTE: "success",
  LOCKDOWN: "destructive",
};

type ActionFormValues = z.infer<typeof moderationActionSchema> & { action: ModerationAction };

export default function ModerationPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [cases, setCases] = React.useState<ModerationCase[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterAction, setFilterAction] = React.useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedAction, setSelectedAction] = React.useState<ModerationAction>("WARN");
  const [submitting, setSubmitting] = React.useState(false);

  const { items: liveEvents } = useRealtime(
    [RealtimeEvent.ModerationBan, RealtimeEvent.ModerationKick, RealtimeEvent.ModerationTimeout, RealtimeEvent.ModerationWarn],
    { guildId, maxEvents: 1, toastOnEvent: true, toastMessage: (e) => `New moderation action in this server: ${e.event}` },
  );

  const load = React.useCallback(() => {
    setLoading(true);
    apiGet<ModerationCase[]>(`/guilds/${guildId}/moderation/cases`)
      .then(setCases)
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, [guildId]);

  React.useEffect(() => {
    load();
  }, [load, liveEvents.length]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof moderationActionSchema>>({ resolver: zodResolver(moderationActionSchema) });

  async function onSubmit(values: z.infer<typeof moderationActionSchema>) {
    setSubmitting(true);
    try {
      await apiPost(`/guilds/${guildId}/moderation/${selectedAction.toLowerCase()}`, values);
      toast.success(`${selectedAction} action issued`);
      setDialogOpen(false);
      reset();
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to issue action");
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = filterAction === "ALL" ? cases : cases.filter((c) => c.action === filterAction);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold">Moderation cases</h2>
          <p className="text-sm text-muted-foreground">Full history of warns, mutes, kicks, and bans.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All actions</SelectItem>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus className="h-4 w-4" /> New action
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Gavel className="h-4 w-4" /> Issue moderation action
                </DialogTitle>
                <DialogDescription>Apply a moderation action to a member of this server.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Action</Label>
                  <Select value={selectedAction} onValueChange={(v) => setSelectedAction(v as ModerationAction)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIONS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="targetId">Target user ID</Label>
                  <Input id="targetId" placeholder="Discord user ID" {...register("targetId")} />
                  {errors.targetId && <p className="text-xs text-destructive">{errors.targetId.message}</p>}
                </div>
                {(selectedAction === "TIMEOUT" || selectedAction === "TEMPBAN" || selectedAction === "MUTE") && (
                  <div className="space-y-1.5">
                    <Label htmlFor="durationSeconds">Duration (seconds)</Label>
                    <Input id="durationSeconds" type="number" {...register("durationSeconds", { valueAsNumber: true })} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea id="reason" placeholder="Reason for this action…" rows={3} {...register("reason")} />
                </div>
                <DialogFooter>
                  <Button type="submit" variant="gradient" loading={submitting}>
                    Confirm {selectedAction.toLowerCase()}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card glass>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4" /> Case history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No moderation cases found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Moderator</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">#{c.caseNumber}</TableCell>
                    <TableCell>{c.targetTag}</TableCell>
                    <TableCell>
                      <Badge variant={actionColor[c.action]}>{c.action}</Badge>
                    </TableCell>
                    <TableCell>{c.moderatorTag}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground">{c.reason ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.active ? "success" : "secondary"}>{c.active ? "Active" : "Resolved"}</Badge>
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
