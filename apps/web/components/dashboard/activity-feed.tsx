"use client";

import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Radio } from "lucide-react";
import type { RealtimeEnvelope } from "@nexusbot/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ActivityFeedProps {
  events: RealtimeEnvelope[];
  connected: boolean;
  describe: (envelope: RealtimeEnvelope) => string;
  emptyLabel?: string;
}

export function ActivityFeed({ events, connected, describe, emptyLabel }: ActivityFeedProps) {
  return (
    <Card glass className="flex h-full flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Live activity</CardTitle>
        <Badge variant={connected ? "success" : "secondary"} className="gap-1">
          <Radio className={cn("h-3 w-3", connected && "animate-pulse")} />
          {connected ? "Live" : "Offline"}
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 overflow-y-auto pt-0">
        {events.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {emptyLabel ?? "Waiting for realtime events…"}
          </p>
        )}
        <AnimatePresence initial={false}>
          {events.map((event, idx) => (
            <motion.div
              key={`${event.timestamp}-${idx}`}
              initial={{ opacity: 0, x: -12, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{describe(event)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
