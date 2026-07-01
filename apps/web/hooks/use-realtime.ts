"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RealtimeEvent, guildRoom, ADMIN_ROOM, type RealtimeEnvelope } from "@nexusbot/shared";
import { toast } from "sonner";
import { getSocket, joinGuildRoom, leaveGuildRoom } from "@/lib/socket";

export interface UseRealtimeOptions {
  /** Room scope. Pass a guildId to join `guild:<id>`, or "admin" to join the admin room. */
  guildId?: string | "admin";
  /** Cap on how many events are retained client-side (defaults 50). */
  maxEvents?: number;
  /** Show a toast notification whenever a matching event arrives. */
  toastOnEvent?: boolean;
  toastMessage?: (envelope: RealtimeEnvelope) => string;
  /** Disable the subscription entirely (e.g. while guildId is not yet known). */
  enabled?: boolean;
}

/**
 * Subscribes to one or more RealtimeEvent names scoped to a guild room (or
 * the admin global room), returning the latest received envelopes. Used to
 * drive live activity feeds, counters, and toast-on-event UI across the
 * dashboard.
 */
export function useRealtime<T = unknown>(
  events: RealtimeEvent | RealtimeEvent[],
  options: UseRealtimeOptions = {},
) {
  const { guildId, maxEvents = 50, toastOnEvent = false, toastMessage, enabled = true } = options;
  const [items, setItems] = useState<RealtimeEnvelope<T>[]>([]);
  const [connected, setConnected] = useState(false);
  const eventList = Array.isArray(events) ? events : [events];
  const eventKey = eventList.join(",");

  const handlersRef = useRef<Map<string, (payload: RealtimeEnvelope<T>) => void>>(new Map());

  const clear = useCallback(() => setItems([]), []);

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    setConnected(socket.connected);

    if (guildId && guildId !== "admin") {
      joinGuildRoom(guildId);
    }

    const handlers = handlersRef.current;
    handlers.clear();

    for (const evt of eventList) {
      const handler = (payload: RealtimeEnvelope<T>) => {
        setItems((prev) => [payload, ...prev].slice(0, maxEvents));
        if (toastOnEvent) {
          toast(toastMessage ? toastMessage(payload) : `${evt} event received`);
        }
      };
      handlers.set(evt, handler);
      socket.on(evt, handler);
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      for (const [evt, handler] of handlers.entries()) {
        socket.off(evt, handler);
      }
      if (guildId && guildId !== "admin") {
        leaveGuildRoom(guildId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventKey, guildId, enabled, maxEvents, toastOnEvent]);

  return { items, connected, clear, room: guildId === "admin" ? ADMIN_ROOM : guildId ? guildRoom(guildId) : null };
}
