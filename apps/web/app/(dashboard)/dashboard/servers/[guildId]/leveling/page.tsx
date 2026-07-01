"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Crown, TrendingUp } from "lucide-react";
import { RealtimeEvent } from "@nexusbot/shared";
import { xpForLevel } from "@nexusbot/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PieDistributionChart } from "@/components/charts/pie-distribution-chart";
import { apiGet } from "@/lib/api";
import { useRealtime } from "@/hooks/use-realtime";
import { cn, formatNumber, initials } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types";

export default function LevelingPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { items } = useRealtime([RealtimeEvent.LevelUp, RealtimeEvent.LeaderboardUpdate], { guildId, maxEvents: 1 });

  const load = React.useCallback(() => {
    setLoading(true);
    apiGet<LeaderboardEntry[]>(`/guilds/${guildId}/leveling/leaderboard`)
      .then(setLeaderboard)
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false));
  }, [guildId]);

  React.useEffect(() => {
    load();
  }, [load, items.length]);

  const distribution = React.useMemo(() => {
    const buckets = { "1-10": 0, "11-25": 0, "26-50": 0, "51-100": 0, "100+": 0 };
    for (const entry of leaderboard) {
      const lvl = entry.level ?? 0;
      if (lvl <= 10) buckets["1-10"]++;
      else if (lvl <= 25) buckets["11-25"]++;
      else if (lvl <= 50) buckets["26-50"]++;
      else if (lvl <= 100) buckets["51-100"]++;
      else buckets["100+"]++;
    }
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [leaderboard]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card glass className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> XP leaderboard
            </CardTitle>
            <CardDescription>Top members by experience earned</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : leaderboard.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No leveling activity yet.</p>
            ) : (
              leaderboard.map((entry, idx) => {
                const nextLevelXp = xpForLevel(entry.level ?? 0);
                const pct = nextLevelXp > 0 ? Math.min(100, (entry.value % nextLevelXp) / nextLevelXp * 100) : 0;
                return (
                  <motion.div
                    key={entry.discordUserId}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        entry.rank === 1 && "bg-warning/20 text-warning",
                        entry.rank !== 1 && "bg-muted text-muted-foreground",
                      )}
                    >
                      {entry.rank === 1 ? <Crown className="h-4 w-4" /> : entry.rank}
                    </span>
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={entry.avatarUrl ?? undefined} />
                      <AvatarFallback>{initials(entry.username)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-sm font-medium">{entry.username}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          Lv {entry.level ?? 0} · {formatNumber(entry.value)} XP
                        </span>
                      </div>
                      <Progress value={pct} className="mt-1.5 h-1.5" />
                    </div>
                  </motion.div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader>
            <CardTitle className="text-base">Level distribution</CardTitle>
            <CardDescription>Member count by level bracket</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No data yet
              </div>
            ) : (
              <PieDistributionChart data={distribution} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
