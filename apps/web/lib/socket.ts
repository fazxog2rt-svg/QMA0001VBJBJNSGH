"use client";

import { io, type Socket } from "socket.io-client";
import { env } from "./env";

let socket: Socket | null = null;

/**
 * Returns a singleton Socket.IO client connected to the realtime gateway
 * exposed by apps/api. Auth is via the httpOnly session cookie
 * (withCredentials), and the server places the connection into the
 * appropriate `guild:<id>` / `admin:global` rooms based on the verified
 * session — the client only needs to listen.
 */
export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(env.socketUrl, {
    withCredentials: true,
    autoConnect: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  return socket;
}

/** Explicitly requests the server join this socket to a guild's realtime room. */
export function joinGuildRoom(guildId: string): void {
  getSocket().emit("join:guild", { guildId });
}

export function leaveGuildRoom(guildId: string): void {
  getSocket().emit("leave:guild", { guildId });
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
