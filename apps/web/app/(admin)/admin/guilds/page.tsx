"use client";

import * as React from "react";
import { toast } from "sonner";
import { Search, ShieldOff, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PremiumBadge } from "@/components/dashboard/premium-badge";
import { apiGet, apiPatch, ApiError } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { Guild } from "@/types";

export default function AdminGuildsPage() {
  const [query, setQuery] = React.useState("");
  const [guilds, setGuilds] = React.useState<Guild[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    apiGet<Guild[]>("/admin/guilds", { search: query || undefined })
      .then(setGuilds)
      .catch(() => setGuilds([]))
      .finally(() => setLoading(false));
  }, [query]);

  React.useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function toggleBlacklist(guild: Guild) {
    setUpdatingId(guild.id);
    try {
      await apiPatch(`/admin/guilds/${guild.id}`, { isBlacklisted: !guild.isBlacklisted });
      setGuilds((prev) => prev.map((g) => (g.id === guild.id ? { ...g, isBlacklisted: !g.isBlacklisted } : g)));
      toast.success(guild.isBlacklisted ? "Guild unblocked" : "Guild blacklisted");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update guild");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Card glass>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">All guilds</CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search guilds…" className="pl-9" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : guilds.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No guilds found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guild</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guilds.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell>{formatNumber(g.memberCount)}</TableCell>
                  <TableCell>
                    <PremiumBadge tier={g.premiumTier} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={g.isBlacklisted ? "destructive" : "success"}>
                      {g.isBlacklisted ? "Blacklisted" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={updatingId === g.id}
                      onClick={() => toggleBlacklist(g)}
                      aria-label="Toggle blacklist"
                    >
                      {g.isBlacklisted ? (
                        <ShieldCheck className="h-4 w-4 text-success" />
                      ) : (
                        <ShieldOff className="h-4 w-4 text-destructive" />
                      )}
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
