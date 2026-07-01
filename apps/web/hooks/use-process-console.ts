"use client";

import { useEffect, useRef, useState } from "react";
import { ProcessEvent, type ProcessEnvelope, type ProcessLogPayload, type ProcessStatusPayload } from "@nexusbot/shared";
import { getSocket, joinInstanceRoom, leaveInstanceRoom } from "@/lib/socket";
import type { BotInstanceStatus } from "@/types";

export interface ConsoleLine {
  id: number;
  stream: "stdout" | "stderr" | "system";
  line: string;
  timestamp: string;
}

const MAX_LINES = 500;

/**
 * Joins a BotInstance's Bot Console room and streams live log lines +
 * status changes pushed by apps/agent via apps/api's `/agent` namespace
 * relay. See packages/shared/src/events.ts for the ProcessEvent contract.
 */
export function useProcessConsole(instanceId: string | null, initialStatus?: BotInstanceStatus) {
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [status, setStatus] = useState<BotInstanceStatus | undefined>(initialStatus);
  const idCounter = useRef(0);

  useEffect(() => {
    if (!instanceId) return;
    const socket = getSocket();
    joinInstanceRoom(instanceId);

    const onLog = (envelope: ProcessEnvelope<ProcessLogPayload>) => {
      if (envelope.instanceId !== instanceId) return;
      idCounter.current += 1;
      setLines((prev) =>
        [
          ...prev,
          { id: idCounter.current, stream: envelope.data.stream, line: envelope.data.line, timestamp: envelope.timestamp },
        ].slice(-MAX_LINES),
      );
    };

    const onStatus = (envelope: ProcessEnvelope<ProcessStatusPayload>) => {
      if (envelope.instanceId !== instanceId) return;
      setStatus(envelope.data.status);
    };

    socket.on(ProcessEvent.Log, onLog);
    socket.on(ProcessEvent.StatusChanged, onStatus);

    return () => {
      socket.off(ProcessEvent.Log, onLog);
      socket.off(ProcessEvent.StatusChanged, onStatus);
      leaveInstanceRoom(instanceId);
    };
  }, [instanceId]);

  useEffect(() => {
    setStatus(initialStatus);
    setLines([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId]);

  return { lines, status };
}
