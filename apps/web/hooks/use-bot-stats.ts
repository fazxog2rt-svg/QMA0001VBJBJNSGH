"use client";

import { useEffect, useState } from "react";
import { RealtimeEvent, type BotStatsPayload } from "@nexusbot/shared";
import { apiGet } from "@/lib/api";
import { useRealtime } from "./use-realtime";

/**
 * Loads bot stats once from GET /api/v1/public/stats (or /admin/stats for
 * platform-wide numbers), then keeps them fresh via the `bot.stats`
 * realtime event broadcast into the admin room.
 */
export function useBotStats() {
  const [stats, setStats] = useState<BotStatsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    apiGet<BotStatsPayload>("/public/stats", undefined, controller.signal)
      .then(setStats)
      .catch(() => {
        /* left null; page renders an empty/skeleton state */
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const { items } = useRealtime<BotStatsPayload>(RealtimeEvent.BotStats, {
    guildId: "admin",
    maxEvents: 1,
  });

  useEffect(() => {
    if (items[0]) setStats(items[0].data);
  }, [items]);

  return { stats, loading };
}
