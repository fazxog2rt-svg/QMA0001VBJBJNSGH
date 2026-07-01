"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  TerminalSquare,
  Plus,
  Play,
  Square,
  RotateCw,
  Trash2,
  Copy,
  KeyRound,
  Circle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { apiGet, apiPost, apiDelete, ApiError } from "@/lib/api";
import { useProcessConsole } from "@/hooks/use-process-console";
import { env } from "@/lib/env";
import type { BotInstance, BotInstanceStatus } from "@/types";

const STATUS_META: Record<BotInstanceStatus, { label: string; variant: "success" | "warning" | "destructive" | "outline" }> = {
  ONLINE: { label: "Online", variant: "success" },
  STARTING: { label: "Starting", variant: "warning" },
  STOPPING: { label: "Stopping", variant: "warning" },
  READY: { label: "Ready", variant: "outline" },
  OFFLINE: { label: "Agent offline", variant: "outline" },
  CRASHED: { label: "Crashed", variant: "destructive" },
};

function StatusBadge({ status }: { status: BotInstanceStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.OFFLINE;
  return (
    <Badge variant={meta.variant} className="gap-1.5">
      <Circle className="h-2 w-2 fill-current" /> {meta.label}
    </Badge>
  );
}

export default function BotConsolePage() {
  const [instances, setInstances] = React.useState<BotInstance[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [issuedToken, setIssuedToken] = React.useState<string | null>(null);
  const [actionPending, setActionPending] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ instances: BotInstance[] }>("/bot-instances");
      setInstances(res.instances);
      setSelectedId((prev) => prev ?? res.instances[0]?.id ?? null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load bot instances");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const selected = instances.find((i) => i.id === selectedId) ?? null;
  const { lines, status } = useProcessConsole(selected?.id ?? null, selected?.status);
  const consoleEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  async function createInstance(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await apiPost<{ instance: BotInstance; token: string }>("/bot-instances", { name: newName.trim() });
      setInstances((prev) => [{ ...res.instance, agentConnected: false }, ...prev]);
      setIssuedToken(res.token);
      setSelectedId(res.instance.id);
      setNewName("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create instance");
    } finally {
      setCreating(false);
    }
  }

  async function runCommand(id: string, command: "start" | "stop" | "restart") {
    setActionPending(`${id}:${command}`);
    try {
      await apiPost(`/bot-instances/${id}/${command}`);
      toast.success(`${command[0].toUpperCase()}${command.slice(1)} signal sent`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Agent is not connected — start the agent daemon on your server first");
      } else {
        toast.error(err instanceof ApiError ? err.message : `Failed to ${command} instance`);
      }
    } finally {
      setActionPending(null);
    }
  }

  async function removeInstance(id: string) {
    try {
      await apiDelete(`/bot-instances/${id}`);
      setInstances((prev) => prev.filter((i) => i.id !== id));
      if (selectedId === id) setSelectedId(null);
      toast.success("Instance deleted");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete instance");
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <TerminalSquare className="h-6 w-6" /> Bot Console
          </h1>
          <p className="text-sm text-muted-foreground">
            Start, stop, and watch the logs of your own bot process — running on your own server, controlled
            from here via a lightweight agent.
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setIssuedToken(null);
          }}
        >
          <DialogTrigger asChild>
            <Button variant="gradient">
              <Plus className="h-4 w-4" /> New instance
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Register a bot instance</DialogTitle>
              <DialogDescription>
                {issuedToken
                  ? "Store this token securely — it's only shown once. Put it in the agent's .env on your server."
                  : "This just registers the instance and issues an agent token. Your bot process itself stays on your own server."}
              </DialogDescription>
            </DialogHeader>

            {issuedToken ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs">
                  <span className="flex-1 truncate">{issuedToken}</span>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => copy(issuedToken)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label>Configure the agent (`apps/agent/.env`)</Label>
                  <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-xs">
{`NEXUS_API_URL=${env.apiUrl}
NEXUS_AGENT_TOKEN=${issuedToken}
NEXUS_START_COMMAND=npm start
NEXUS_WORKING_DIR=/path/to/your/bot`}
                  </pre>
                </div>
                <DialogFooter>
                  <Button onClick={() => setDialogOpen(false)}>Done</Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={createInstance} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="instanceName">Instance name</Label>
                  <Input
                    id="instanceName"
                    placeholder="Production bot"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" variant="gradient" loading={creating}>
                    <KeyRound className="h-4 w-4" /> Generate token
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Instance list */}
        <Card glass className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Instances</CardTitle>
            <CardDescription>Bots you&apos;ve registered for remote control.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : instances.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No instances yet. Create one to get a setup token for the agent.
              </p>
            ) : (
              instances.map((instance) => (
                <button
                  key={instance.id}
                  onClick={() => setSelectedId(instance.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedId === instance.id ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{instance.name}</span>
                    <StatusBadge status={instance.id === selectedId ? (status ?? instance.status) : instance.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {instance.agentConnected ? "Agent connected" : "Agent not connected"}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Console */}
        <Card glass className="flex min-h-[480px] flex-col">
          {selected ? (
            <>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {selected.name} <StatusBadge status={status ?? selected.status} />
                  </CardTitle>
                  <CardDescription>
                    {selected.pid ? `pid ${selected.pid}` : "not running"}
                    {selected.lastConnectedAt && ` · agent last connected ${new Date(selected.lastConnectedAt).toLocaleString()}`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionPending !== null || (status ?? selected.status) === "ONLINE"}
                    loading={actionPending === `${selected.id}:start`}
                    onClick={() => runCommand(selected.id, "start")}
                  >
                    <Play className="h-3.5 w-3.5" /> Start
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionPending !== null || (status ?? selected.status) === "READY" || (status ?? selected.status) === "OFFLINE"}
                    loading={actionPending === `${selected.id}:stop`}
                    onClick={() => runCommand(selected.id, "stop")}
                  >
                    <Square className="h-3.5 w-3.5" /> Stop
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionPending !== null}
                    loading={actionPending === `${selected.id}:restart`}
                    onClick={() => runCommand(selected.id, "restart")}
                  >
                    <RotateCw className="h-3.5 w-3.5" /> Restart
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => removeInstance(selected.id)} aria-label="Delete instance">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="h-full max-h-[420px] overflow-y-auto rounded-lg border border-border bg-black/90 p-3 font-mono text-xs text-green-400">
                  {lines.length === 0 ? (
                    <p className="text-muted-foreground">Waiting for log output…</p>
                  ) : (
                    lines.map((l) => (
                      <div key={l.id} className={l.stream === "stderr" ? "text-red-400" : l.stream === "system" ? "text-sky-400" : ""}>
                        <span className="opacity-50">{new Date(l.timestamp).toLocaleTimeString()}</span> {l.line}
                      </div>
                    ))
                  )}
                  <div ref={consoleEndRef} />
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select or create an instance to open its console.
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
