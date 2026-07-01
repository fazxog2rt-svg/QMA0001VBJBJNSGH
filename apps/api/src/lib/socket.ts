import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import cookie from "cookie";
import { prisma } from "@nexusbot/database";
import {
  ADMIN_ROOM,
  guildRoom,
  instanceRoom,
  RealtimeEvent,
  type RealtimeEnvelope,
} from "@nexusbot/shared";
import { corsOrigins } from "../config/env";
import { verifyAccessToken } from "./jwt";
import { subscribeToRealtimeEvents } from "./redis";
import { childLogger } from "./logger";

const log = childLogger("socket");

interface AuthedSocket extends Socket {
  data: {
    userId: string;
    role: string;
  };
}

let io: SocketIOServer | undefined;

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.IO server has not been initialized yet");
  return io;
}

/** Pulls the JWT access token from cookies or the socket.io `auth.token` field. */
function extractToken(socket: Socket): string | undefined {
  const authToken = socket.handshake.auth?.token as string | undefined;
  if (authToken) return authToken;

  const rawCookie = socket.handshake.headers.cookie;
  if (!rawCookie) return undefined;
  const parsed = cookie.parse(rawCookie);
  return parsed.access_token;
}

export function createSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
    path: "/socket.io",
  });

  io.use(async (socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) return next(new Error("unauthorized"));
      const payload = verifyAccessToken(token);
      (socket as AuthedSocket).data.userId = payload.sub;
      (socket as AuthedSocket).data.role = payload.role;
      next();
    } catch (err) {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", async (socket: AuthedSocket) => {
    const { userId, role } = socket.data;
    log.info({ userId, socketId: socket.id }, "Socket connected");

    try {
      if (role === "ADMIN" || role === "OWNER") {
        await socket.join(ADMIN_ROOM);
      }

      const staffRows = await prisma.guildStaff.findMany({
        where: { userId },
        select: { guildId: true },
      });
      for (const row of staffRows) {
        await socket.join(guildRoom(row.guildId));
      }

      // Clients may also request to join a specific guild room explicitly
      // (server re-validates staff membership before allowing it).
      socket.on("join-guild", async (guildId: string) => {
        if (typeof guildId !== "string" || !guildId) return;
        if (role === "ADMIN" || role === "OWNER") {
          await socket.join(guildRoom(guildId));
          return;
        }
        const isStaff = await prisma.guildStaff.findUnique({
          where: { guildId_userId: { guildId, userId } },
        });
        if (isStaff) await socket.join(guildRoom(guildId));
      });

      socket.on("leave-guild", (guildId: string) => {
        if (typeof guildId === "string" && guildId) void socket.leave(guildRoom(guildId));
      });

      // Bot Console: dashboard joins an instance's log/status room after
      // verifying the caller actually owns that BotInstance.
      socket.on("join-instance", async (instanceId: string) => {
        if (typeof instanceId !== "string" || !instanceId) return;
        if (role === "ADMIN" || role === "OWNER") {
          await socket.join(instanceRoom(instanceId));
          return;
        }
        const instance = await prisma.botInstance.findUnique({ where: { id: instanceId } });
        if (instance && instance.ownerId === userId) await socket.join(instanceRoom(instanceId));
      });

      socket.on("leave-instance", (instanceId: string) => {
        if (typeof instanceId === "string" && instanceId) void socket.leave(instanceRoom(instanceId));
      });
    } catch (err) {
      log.error({ err, userId }, "Failed to join rooms on socket connect");
    }

    socket.on("disconnect", () => {
      log.info({ userId, socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}

/**
 * Subscribes to the shared Redis events channel and relays every envelope
 * published by apps/bot into the matching Socket.IO guild room, plus the
 * global admin room for platform-wide dashboards.
 */
export async function startRealtimeRelay(): Promise<void> {
  await subscribeToRealtimeEvents((raw) => {
    let envelope: RealtimeEnvelope;
    try {
      envelope = JSON.parse(raw) as RealtimeEnvelope;
    } catch (err) {
      log.error({ err }, "Failed to parse realtime envelope from Redis");
      return;
    }
    if (!envelope || typeof envelope.event !== "string") return;
    if (!Object.values(RealtimeEvent).includes(envelope.event)) return;

    const server = io;
    if (!server) return;

    server.to(guildRoom(envelope.guildId)).emit(envelope.event, envelope);
    server.to(ADMIN_ROOM).emit(envelope.event, envelope);
  });
}
