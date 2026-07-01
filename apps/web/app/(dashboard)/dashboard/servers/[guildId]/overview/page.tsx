"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Users, MessageSquare, Mic, Shield, TrendingUp } from "lucide-react";
import { RealtimeEvent } from "@nexusbot/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AreaGrowthChart, type GrowthPoint } from "@/components/charts/area-growth-chart";
import { apiGet } from "@/lib/api";
import { useRealtime } from "@/hooks/use-realtime";
import type { Guild, GuildStatSnapshot } from "@/types";

const FEED_EVENTS: RealtimeEvent[] = [
  RealtimeEvent.MemberJoin,
  RealtimeEvent.MemberLeave,
  RealtimeEvent.ModerationBan,
  RealtimeEvent.ModerationKick,
  RealtimeEvent.ModerationTimeout,
  RealtimeEvent.ModerationWarn,
  RealtimeEvent.RoleUpdate,
];

export default function GuildOverviewPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [guild, setGuild] = React.useState<Guild | null>(null);
  const [snapshots, setSnapshots] = React.useState<GuildStatSnapshot[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { items, connected } = useRealtime(FEED_EVENTS, { guildId, maxEvents: 20 });

  React.useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      apiGet<Guild>(`/guilds/${guildId}`, undefined, controller.signal),
      apiGet<GuildStatSnapshot[]>(`/guilds/${guildId}/analytics/growth`, undefined, controller.signal),
    ])
      .then(([g, s]) => {
        setGuild(g);
        setSnapshots(s);
      })
      .catch(() => {
        /* empty state handled below */
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [guildId]);

  const growthData: GrowthPoint[] = snapshots.map((s) => ({
    date: new Date(s.capturedAt).toLocaleDateString([], { month: "short", day: "numeric" }),
    value: s.memberCount,
  }));

  const latest = snapshots.at(-1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Members" value={guild?.memberCount ?? 0} icon={Users} loading={loading} accent="primary" />
        <StatCard label="Messages tracked" value={latest?.messageCount ?? 0} icon={MessageSquare} loading={loading} accent="accent" />
        <StatCard label="Voice minutes" value={latest?.voiceMinutes ?? 0} icon={Mic} loading={loading} accent="success" />
        <StatCard label="Commands used" value={latest?.commandCount ?? 0} icon={TrendingUp} loading={loading} accent="warning" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card glass className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Member growth</CardTitle>
            <CardDescription>Total member count over time</CardDescription>
          </CardHeader>
          <CardContent>
            {growthData.length > 0 ? (
              <AreaGrowthChart data={growthData} label="Members" />
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No growth data yet — snapshots accumulate over time.
              </div>
            )}
          </CardContent>
        </Card>

        <ActivityFeed
          events={items}
          connected={connected}
          describe={(e) => {
            const data = e.data as Record<string, unknown>;
            const who = (data?.username as string) ?? (data?.targetTag as string) ?? "Someone";
            return `${e.event.replace(".", " ")} — ${who}`;
          }}
        />
      </div>

      <Card glass>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" /> Server info
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Owner ID</p>
            <p className="font-mono">{guild?.ownerId ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Region</p>
            <p>{guild?.region ?? "Auto"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Installed</p>
            <p>{guild ? new Date(guild.installedAt).toLocaleDateString() : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Guild ID</p>
            <p className="font-mono">{guildId}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
