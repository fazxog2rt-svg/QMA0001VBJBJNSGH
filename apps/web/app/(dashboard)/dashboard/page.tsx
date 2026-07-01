"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, Cpu, MemoryStick, Server, Users, Zap, Megaphone, ArrowRight } from "lucide-react";
import { RealtimeEvent, type RealtimeEnvelope } from "@nexusbot/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { BarUsageChart } from "@/components/charts/bar-usage-chart";
import { LinePingChart } from "@/components/charts/line-ping-chart";
import { useBotStats } from "@/hooks/use-bot-stats";
import { useRealtime } from "@/hooks/use-realtime";
import { apiGet } from "@/lib/api";
import { formatMb, formatUptime } from "@/lib/utils";
import type { Announcement } from "@/types";

const FEED_EVENTS: RealtimeEvent[] = [
  RealtimeEvent.MemberJoin,
  RealtimeEvent.MemberLeave,
  RealtimeEvent.ModerationBan,
  RealtimeEvent.ModerationKick,
  RealtimeEvent.ModerationTimeout,
  RealtimeEvent.ModerationWarn,
  RealtimeEvent.TicketOpened,
  RealtimeEvent.TicketClosed,
  RealtimeEvent.LevelUp,
  RealtimeEvent.EconomyTransaction,
  RealtimeEvent.GiveawayEnded,
  RealtimeEvent.BoostEvent,
];

function describeEvent(envelope: RealtimeEnvelope): string {
  const data = envelope.data as Record<string, unknown> | undefined;
  const who = (data?.username as string) ?? (data?.targetTag as string) ?? "Someone";
  switch (envelope.event) {
    case RealtimeEvent.MemberJoin:
      return `${who} joined a server`;
    case RealtimeEvent.MemberLeave:
      return `${who} left a server`;
    case RealtimeEvent.ModerationBan:
      return `${who} was banned`;
    case RealtimeEvent.ModerationKick:
      return `${who} was kicked`;
    case RealtimeEvent.ModerationTimeout:
      return `${who} was timed out`;
    case RealtimeEvent.ModerationWarn:
      return `${who} received a warning`;
    case RealtimeEvent.TicketOpened:
      return `New ticket opened${data?.subject ? `: ${data.subject}` : ""}`;
    case RealtimeEvent.TicketClosed:
      return `Ticket closed`;
    case RealtimeEvent.LevelUp:
      return `${who} leveled up to ${(data?.level as number) ?? "?"}`;
    case RealtimeEvent.EconomyTransaction:
      return `Economy transaction: ${(data?.type as string) ?? "unknown"}`;
    case RealtimeEvent.GiveawayEnded:
      return `Giveaway ended: ${(data?.prize as string) ?? "prize"}`;
    case RealtimeEvent.BoostEvent:
      return `Server boost event`;
    default:
      return envelope.event;
  }
}

const commandUsageDemoShape = [
  { label: "Mon", value: 0 },
  { label: "Tue", value: 0 },
  { label: "Wed", value: 0 },
  { label: "Thu", value: 0 },
  { label: "Fri", value: 0 },
  { label: "Sat", value: 0 },
  { label: "Sun", value: 0 },
];

export default function DashboardHomePage() {
  const { stats, loading: statsLoading } = useBotStats();
  const { items: activity, connected } = useRealtime(FEED_EVENTS, { guildId: "admin", maxEvents: 25 });
  const [commandUsage, setCommandUsage] = React.useState(commandUsageDemoShape);
  const [pingHistory, setPingHistory] = React.useState<{ time: string; ping: number }[]>([]);
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();
    apiGet<{ label: string; value: number }[]>("/analytics/commands/weekly", undefined, controller.signal)
      .then(setCommandUsage)
      .catch(() => {
        /* keep zeroed demo shape as an empty-state chart */
      });
    apiGet<Announcement[]>("/public/announcements", { published: true }, controller.signal)
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]))
      .finally(() => setAnnouncementsLoading(false));
    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    if (!stats) return;
    setPingHistory((prev) =>
      [...prev, { time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), ping: stats.ping }].slice(-20),
    );
  }, [stats]);

  const cpuRamPct = stats ? Math.round((stats.ramUsedMb / Math.max(stats.ramTotalMb, 1)) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Home</h1>
          <p className="text-sm text-muted-foreground">Live overview of your NexusBot deployment.</p>
        </div>
        <Badge variant={stats ? "success" : "secondary"} className="w-fit gap-1.5">
          <span className={`h-2 w-2 rounded-full ${stats ? "animate-pulse-glow bg-success" : "bg-muted-foreground"}`} />
          {stats ? "Bot online" : "Awaiting bot status"}
        </Badge>
      </div>

      {/* Bot status row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Servers" value={stats?.guildCount ?? 0} icon={Server} loading={statsLoading} accent="primary" />
        <StatCard label="Users" value={stats?.userCount ?? 0} icon={Users} loading={statsLoading} accent="accent" />
        <StatCard label="Commands executed" value={stats?.commandsExecuted ?? 0} icon={Zap} loading={statsLoading} accent="warning" />
        <StatCard label="Ping" value={stats?.ping ?? 0} suffix="ms" icon={Activity} loading={statsLoading} accent="success" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Bot resource card */}
        <Card glass className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Bot health</CardTitle>
            <CardDescription>CPU, memory, uptime and shard status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {statsLoading || !stats ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Cpu className="h-4 w-4" /> CPU
                  </span>
                  <span className="font-semibold">{stats.cpuPercent.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <MemoryStick className="h-4 w-4" /> Memory
                  </span>
                  <span className="font-semibold">
                    {formatMb(stats.ramUsedMb)} / {formatMb(stats.ramTotalMb)} ({cpuRamPct}%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="font-semibold">{formatUptime(stats.uptimeSeconds)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Shards</span>
                  <span className="font-semibold">{stats.shardCount}</span>
                </div>
                <LinePingChart data={pingHistory.length ? pingHistory : [{ time: "now", ping: stats.ping }]} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Command usage chart */}
        <Card glass className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Command usage (7 days)</CardTitle>
            <CardDescription>Total slash + prefix commands executed per day across all servers</CardDescription>
          </CardHeader>
          <CardContent>
            <BarUsageChart data={commandUsage} label="Commands" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity feed */}
        <div className="lg:col-span-2">
          <ActivityFeed events={activity} connected={connected} describe={describeEvent} />
        </div>

        {/* Announcements */}
        <Card glass>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4" /> News &amp; changelog
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcementsLoading && (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            )}
            {!announcementsLoading && announcements.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No announcements yet.</p>
            )}
            {announcements.slice(0, 4).map((a) => (
              <div key={a.id} className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge variant={a.type === "changelog" ? "gradient" : "secondary"} className="text-[10px]">
                    {a.type}
                  </Badge>
                  {a.version && <span className="text-xs text-muted-foreground">v{a.version}</span>}
                </div>
                <p className="text-sm font-medium">{a.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.content}</p>
              </div>
            ))}
            <Link
              href="/dashboard/servers"
              className="flex items-center justify-center gap-1 pt-1 text-xs font-medium text-primary hover:underline"
            >
              View all servers <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
