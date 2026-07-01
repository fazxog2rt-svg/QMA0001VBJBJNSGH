"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { BarChart3, MessageSquare, Mic, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaGrowthChart, type GrowthPoint } from "@/components/charts/area-growth-chart";
import { BarUsageChart, type BarPoint } from "@/components/charts/bar-usage-chart";
import { PieDistributionChart } from "@/components/charts/pie-distribution-chart";
import { apiGet } from "@/lib/api";
import type { GuildStatSnapshot } from "@/types";

interface AnalyticsResponse {
  growth: GuildStatSnapshot[];
  commandUsage: BarPoint[];
  messageActivity: BarPoint[];
  voiceActivity: BarPoint[];
  xpDistribution: { name: string; value: number }[];
}

const EMPTY: AnalyticsResponse = {
  growth: [],
  commandUsage: [],
  messageActivity: [],
  voiceActivity: [],
  xpDistribution: [],
};

export default function GuildAnalyticsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [data, setData] = React.useState<AnalyticsResponse>(EMPTY);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();
    apiGet<AnalyticsResponse>(`/guilds/${guildId}/analytics/overview`, undefined, controller.signal)
      .then(setData)
      .catch(() => setData(EMPTY))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [guildId]);

  const growthPoints: GrowthPoint[] = data.growth.map((s) => ({
    date: new Date(s.capturedAt).toLocaleDateString([], { month: "short", day: "numeric" }),
    value: s.memberCount,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Analytics</h2>
        <p className="text-sm text-muted-foreground">Growth, engagement, and XP insights for this server.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card glass>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Member growth
            </CardTitle>
            <CardDescription>Total members over time</CardDescription>
          </CardHeader>
          <CardContent>
            {!loading && growthPoints.length === 0 ? (
              <EmptyChart />
            ) : (
              <AreaGrowthChart data={growthPoints} label="Members" />
            )}
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" /> Command usage
            </CardTitle>
            <CardDescription>Commands executed per day</CardDescription>
          </CardHeader>
          <CardContent>
            {!loading && data.commandUsage.length === 0 ? (
              <EmptyChart />
            ) : (
              <BarUsageChart data={data.commandUsage} label="Commands" color="hsl(var(--primary))" />
            )}
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" /> Message activity
            </CardTitle>
            <CardDescription>Messages sent per day</CardDescription>
          </CardHeader>
          <CardContent>
            {!loading && data.messageActivity.length === 0 ? (
              <EmptyChart />
            ) : (
              <BarUsageChart data={data.messageActivity} label="Messages" color="hsl(var(--accent))" />
            )}
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mic className="h-4 w-4" /> Voice activity
            </CardTitle>
            <CardDescription>Voice minutes tracked per day</CardDescription>
          </CardHeader>
          <CardContent>
            {!loading && data.voiceActivity.length === 0 ? (
              <EmptyChart />
            ) : (
              <BarUsageChart data={data.voiceActivity} label="Minutes" color="hsl(var(--success))" />
            )}
          </CardContent>
        </Card>

        <Card glass className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> XP distribution
            </CardTitle>
            <CardDescription>Member spread across level brackets</CardDescription>
          </CardHeader>
          <CardContent>
            {!loading && data.xpDistribution.length === 0 ? (
              <EmptyChart />
            ) : (
              <PieDistributionChart data={data.xpDistribution} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
      Not enough data yet — check back after some server activity.
    </div>
  );
}
