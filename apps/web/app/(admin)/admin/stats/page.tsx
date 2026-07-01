"use client";

import * as React from "react";
import { Activity, Server, Users, Zap } from "lucide-react";
import { RealtimeEvent } from "@nexusbot/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { AreaGrowthChart, type GrowthPoint } from "@/components/charts/area-growth-chart";
import { PieDistributionChart } from "@/components/charts/pie-distribution-chart";
import { useBotStats } from "@/hooks/use-bot-stats";
import { useRealtime } from "@/hooks/use-realtime";
import { apiGet } from "@/lib/api";

interface PlatformStatsResponse {
  guildGrowth: GrowthPoint[];
  userGrowth: GrowthPoint[];
  tierDistribution: { name: string; value: number }[];
}

const EMPTY: PlatformStatsResponse = { guildGrowth: [], userGrowth: [], tierDistribution: [] };

export default function AdminStatsPage() {
  const { stats, loading } = useBotStats();
  const [platform, setPlatform] = React.useState<PlatformStatsResponse>(EMPTY);
  const [platformLoading, setPlatformLoading] = React.useState(true);
  useRealtime([RealtimeEvent.GuildUpdate], { guildId: "admin", maxEvents: 1 });

  React.useEffect(() => {
    const controller = new AbortController();
    apiGet<PlatformStatsResponse>("/admin/stats", undefined, controller.signal)
      .then(setPlatform)
      .catch(() => setPlatform(EMPTY))
      .finally(() => setPlatformLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total servers" value={stats?.guildCount ?? 0} icon={Server} loading={loading} accent="primary" />
        <StatCard label="Total users" value={stats?.userCount ?? 0} icon={Users} loading={loading} accent="accent" />
        <StatCard label="Commands executed" value={stats?.commandsExecuted ?? 0} icon={Zap} loading={loading} accent="warning" />
        <StatCard label="Bot ping" value={stats?.ping ?? 0} suffix="ms" icon={Activity} loading={loading} accent="success" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card glass className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Platform growth</CardTitle>
            <CardDescription>Guild count over time across the whole platform</CardDescription>
          </CardHeader>
          <CardContent>
            {!platformLoading && platform.guildGrowth.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No growth snapshots yet.
              </div>
            ) : (
              <AreaGrowthChart data={platform.guildGrowth} label="Servers" />
            )}
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader>
            <CardTitle className="text-base">Premium tier split</CardTitle>
            <CardDescription>Distribution of guilds by premium tier</CardDescription>
          </CardHeader>
          <CardContent>
            {!platformLoading && platform.tierDistribution.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">No data yet.</div>
            ) : (
              <PieDistributionChart data={platform.tierDistribution} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
