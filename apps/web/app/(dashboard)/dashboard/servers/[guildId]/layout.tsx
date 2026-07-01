"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PremiumBadge } from "@/components/dashboard/premium-badge";
import { apiGet } from "@/lib/api";
import { formatNumber, initials } from "@/lib/utils";
import type { Guild } from "@/types";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "moderation", label: "Moderation" },
  { value: "automod", label: "AutoMod" },
  { value: "economy", label: "Economy" },
  { value: "leveling", label: "Leveling" },
  { value: "tickets", label: "Tickets" },
  { value: "identity-cards", label: "Identity Cards" },
  { value: "analytics", label: "Analytics" },
  { value: "settings", label: "Settings" },
  { value: "audit-logs", label: "Audit Logs" },
  { value: "webhooks", label: "Webhooks" },
];

export default function GuildLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams<{ guildId: string }>();
  const guildId = params.guildId;
  const [guild, setGuild] = React.useState<Guild | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();
    apiGet<Guild>(`/guilds/${guildId}`, undefined, controller.signal)
      .then(setGuild)
      .catch(() => setGuild(null))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [guildId]);

  const activeTab = TABS.find((t) => pathname.includes(`/${t.value}`))?.value ?? "overview";

  return (
    <div className="space-y-6">
      <Card glass>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          {loading ? (
            <>
              <Skeleton className="h-14 w-14 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </>
          ) : (
            <>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-accent text-lg font-bold text-white shadow-md">
                {guild?.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={guild.iconUrl} alt={guild.name} className="h-full w-full object-cover" />
                ) : (
                  initials(guild?.name ?? "??")
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-bold">{guild?.name ?? "Unknown server"}</h1>
                  {guild && <PremiumBadge tier={guild.premiumTier} />}
                </div>
                <p className="text-sm text-muted-foreground">
                  {guild ? `${formatNumber(guild.memberCount)} members` : guildId}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab}>
        <TabsList className="w-full justify-start">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} asChild>
              <Link href={`/dashboard/servers/${guildId}/${tab.value}`}>{tab.label}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {children}
    </div>
  );
}
