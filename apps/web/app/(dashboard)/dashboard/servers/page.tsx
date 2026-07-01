"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Search, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PremiumBadge } from "@/components/dashboard/premium-badge";
import { apiGet, ApiError } from "@/lib/api";
import { cn, formatNumber, initials } from "@/lib/utils";
import { env } from "@/lib/env";
import type { Guild } from "@/types";

export default function ServersPage() {
  const [guilds, setGuilds] = React.useState<Guild[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    const controller = new AbortController();
    apiGet<Guild[]>("/guilds", undefined, controller.signal)
      .then(setGuilds)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load servers"))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const filtered = guilds.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Servers</h1>
          <p className="text-sm text-muted-foreground">Select a server to manage its settings.</p>
        </div>
        <Button asChild variant="gradient">
          <a href={env.discordInviteUrl} target="_blank" rel="noreferrer">
            <Plus className="h-4 w-4" /> Add to a server
          </a>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter servers…"
          className="pl-9"
        />
      </div>

      {error && (
        <Card glass>
          <CardContent className="p-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} glass>
              <CardContent className="p-5">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="mt-4 h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}

        {!loading &&
          filtered.map((guild, idx) => (
            <motion.div
              key={guild.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.03 }}
            >
              <Link href={`/dashboard/servers/${guild.id}/overview`}>
                <Card
                  glass
                  className={cn(
                    "group h-full cursor-pointer transition-all hover:-translate-y-1 hover:shadow-2xl",
                    guild.isBlacklisted && "opacity-50",
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-accent text-sm font-bold text-white shadow-md">
                        {guild.iconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={guild.iconUrl} alt={guild.name} className="h-full w-full object-cover" />
                        ) : (
                          initials(guild.name)
                        )}
                      </div>
                      <PremiumBadge tier={guild.premiumTier} />
                    </div>
                    <p className="mt-4 truncate font-semibold group-hover:text-primary">{guild.name}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> {formatNumber(guild.memberCount)} members
                    </p>
                    {guild.isBlacklisted && (
                      <p className="mt-2 text-xs font-medium text-destructive">Blacklisted</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}

        {!loading && filtered.length === 0 && !error && (
          <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No servers found</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Invite NexusBot to a Discord server to start managing it from here.
            </p>
            <Button asChild variant="gradient" size="sm">
              <a href={env.discordInviteUrl} target="_blank" rel="noreferrer">
                <Plus className="h-4 w-4" /> Add to a server
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
