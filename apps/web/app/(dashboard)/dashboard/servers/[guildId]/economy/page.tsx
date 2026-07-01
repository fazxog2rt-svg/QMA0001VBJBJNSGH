"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Coins, Landmark, Search, Trophy } from "lucide-react";
import { RealtimeEvent } from "@nexusbot/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiGet, ApiError } from "@/lib/api";
import { useRealtime } from "@/hooks/use-realtime";
import { cn, formatCurrency, initials } from "@/lib/utils";
import type { EconomyProfile, LeaderboardEntry } from "@/types";

export default function EconomyPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [lookupId, setLookupId] = React.useState("");
  const [lookupResult, setLookupResult] = React.useState<EconomyProfile | null>(null);
  const [lookupError, setLookupError] = React.useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = React.useState(false);

  const { items } = useRealtime([RealtimeEvent.EconomyTransaction], { guildId, maxEvents: 1 });

  const loadLeaderboard = React.useCallback(() => {
    setLoading(true);
    apiGet<LeaderboardEntry[]>(`/guilds/${guildId}/economy/leaderboard`)
      .then(setLeaderboard)
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false));
  }, [guildId]);

  React.useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard, items.length]);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupId.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    try {
      const profile = await apiGet<EconomyProfile>(`/guilds/${guildId}/economy/members/${lookupId.trim()}`);
      setLookupResult(profile);
    } catch (err) {
      setLookupResult(null);
      setLookupError(err instanceof ApiError ? err.message : "Member not found");
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card glass className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4" /> Wallet leaderboard
            </CardTitle>
            <CardDescription>Top balances across wallet + bank for this server</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No economy activity yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry) => (
                    <TableRow key={entry.discordUserId}>
                      <TableCell>
                        <span
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                            entry.rank === 1 && "bg-warning/20 text-warning",
                            entry.rank === 2 && "bg-muted-foreground/20 text-muted-foreground",
                            entry.rank === 3 && "bg-orange-500/20 text-orange-500",
                            entry.rank > 3 && "text-muted-foreground",
                          )}
                        >
                          {entry.rank}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={entry.avatarUrl ?? undefined} />
                            <AvatarFallback>{initials(entry.username)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{entry.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatCurrency(entry.value, "$")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card glass>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4" /> Member lookup
            </CardTitle>
            <CardDescription>Look up an economy profile by Discord user ID</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleLookup} className="flex gap-2">
              <Input placeholder="Discord user ID" value={lookupId} onChange={(e) => setLookupId(e.target.value)} />
              <Button type="submit" loading={lookupLoading} variant="secondary">
                Go
              </Button>
            </form>

            {lookupError && <p className="text-sm text-destructive">{lookupError}</p>}

            {lookupResult && (
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Coins className="h-3.5 w-3.5" /> Wallet
                  </span>
                  <span className="font-mono font-semibold">{formatCurrency(lookupResult.wallet, "$")}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Landmark className="h-3.5 w-3.5" /> Bank
                  </span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(lookupResult.bank, "$")} / {formatCurrency(lookupResult.bankCapacity, "$")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Daily streak</span>
                  <Badge variant="gradient">{lookupResult.dailyStreak} days</Badge>
                </div>
                {lookupResult.job && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Job</span>
                    <span>{lookupResult.job}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
