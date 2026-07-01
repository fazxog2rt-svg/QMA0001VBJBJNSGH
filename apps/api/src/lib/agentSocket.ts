import type { Server as SocketIOServer, Socket } from "socket.io";
import { prisma } from "@nexusbot/database";
import {
  instanceRoom,
  ProcessEvent,
  type AgentCommand,
  type ProcessEnvelope,
  type ProcessLogPayload,
  type ProcessStatusPayload,
} from "@nexusbot/shared";
import { sha256 } from "./security";
import { childLogger } from "./logger";

const log = childLogger("agent-socket");

interface AgentSocket extends Socket {
  data: { instanceId: string };
}

// instanceId -> connected agent socket id. Single-API-instance assumption,
// same as the rest of this codebase (no Socket.IO Redis adapter configured).
const connectedAgents = new Map<string, string>();

export function isAgentConnected(instanceId: string): boolean {
  return connectedAgents.has(instanceId);
}

/**
 * Sets up the `/agent` Socket.IO namespace that apps/agent daemons connect
 * to. Auth is a bearer token (hashed + compared against BotInstance.tokenHash)
 * passed as `auth.token` — the same shape as the dashboard's JWT auth, just a
 * long-lived opaque token instead of a short-lived JWT since the agent is a
 * headless, long-running process.
 */
export function createAgentNamespace(io: SocketIOServer): void {
  const agentNs = io.of("/agent");

  agentNs.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("unauthorized"));

      const instance = await prisma.botInstance.findUnique({ where: { tokenHash: sha256(token) } });
      if (!instance) return next(new Error("unauthorized"));

      (socket as AgentSocket).data = { instanceId: instance.id };
      next();
    } catch (err) {
      log.error({ err }, "Agent auth error");
      next(new Error("unauthorized"));
    }
  });

  agentNs.on("connection", (socket: AgentSocket) => {
    const { instanceId } = socket.data;
    connectedAgents.set(instanceId, socket.id);
    log.info({ instanceId, socketId: socket.id }, "Agent connected");

    void prisma.botInstance
      .update({ where: { id: instanceId }, data: { lastConnectedAt: new Date() } })
      .catch((err) => log.error({ err, instanceId }, "Failed to record agent connect"));

    socket.on("log", (payload: ProcessLogPayload) => {
      relayToInstanceRoom(io, instanceId, ProcessEvent.Log, payload);
    });

    socket.on("status", (payload: ProcessStatusPayload) => {
      void prisma.botInstance
        .update({
          where: { id: instanceId },
          data: { status: payload.status, pid: payload.pid ?? null, lastExitCode: payload.exitCode ?? null },
        })
        .catch((err) => log.error({ err, instanceId }, "Failed to persist agent status"));

      relayToInstanceRoom(io, instanceId, ProcessEvent.StatusChanged, payload);
    });

    socket.on("heartbeat", () => {
      void prisma.botInstance
        .update({ where: { id: instanceId }, data: { lastHeartbeatAt: new Date() } })
        .catch(() => undefined);
    });

    socket.on("disconnect", () => {
      connectedAgents.delete(instanceId);
      log.info({ instanceId }, "Agent disconnected");

      void prisma.botInstance
        .update({ where: { id: instanceId }, data: { status: "OFFLINE" } })
        .catch((err) => log.error({ err, instanceId }, "Failed to mark instance offline"));

      relayToInstanceRoom(io, instanceId, ProcessEvent.StatusChanged, { status: "OFFLINE" });
    });
  });
}

function relayToInstanceRoom(io: SocketIOServer, instanceId: string, event: ProcessEvent, data: unknown): void {
  const envelope: ProcessEnvelope = { event, instanceId, timestamp: new Date().toISOString(), data };
  io.of("/").to(instanceRoom(instanceId)).emit(event, envelope);
}

/**
 * Sends a start/stop/restart command to a connected agent. Returns false
 * (caller should respond 409) if no agent is currently connected for this
 * instance.
 */
export function sendAgentCommand(io: SocketIOServer, instanceId: string, command: AgentCommand): boolean {
  const socketId = connectedAgents.get(instanceId);
  if (!socketId) return false;
  io.of("/agent").to(socketId).emit("command", command);
  return true;
}
