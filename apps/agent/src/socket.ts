import { io, type Socket } from "socket.io-client";
import { AGENT_HEARTBEAT_INTERVAL_MS, type AgentCommand } from "@nexusbot/shared";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import type { ProcessManager } from "./process-manager";

export function connectAgentSocket(processManager: ProcessManager): Socket {
  const socket = io(`${env.NEXUS_API_URL}/agent`, {
    auth: { token: env.NEXUS_AGENT_TOKEN },
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 15000,
  });

  let heartbeat: ReturnType<typeof setInterval> | null = null;

  socket.on("connect", () => {
    logger.info("Connected to NexusBot API");
    socket.emit("status", { status: processManager.getStatus(), pid: null, exitCode: null });

    heartbeat = setInterval(() => {
      socket.emit("heartbeat");
    }, AGENT_HEARTBEAT_INTERVAL_MS);
  });

  socket.on("disconnect", (reason) => {
    logger.warn({ reason }, "Disconnected from NexusBot API; will retry");
    if (heartbeat) clearInterval(heartbeat);
  });

  socket.on("connect_error", (err) => {
    logger.error({ err: err.message }, "Socket connection error");
  });

  socket.on("command", (command: AgentCommand) => {
    logger.info({ command }, "Received command from dashboard");
    switch (command) {
      case "start":
        processManager.start();
        break;
      case "stop":
        processManager.stop();
        break;
      case "restart":
        processManager.restart();
        break;
      default:
        logger.warn({ command }, "Unknown command received");
    }
  });

  processManager.on("log", (payload) => {
    if (socket.connected) socket.emit("log", payload);
  });

  processManager.on("status", (payload) => {
    if (socket.connected) socket.emit("status", payload);
  });

  return socket;
}
