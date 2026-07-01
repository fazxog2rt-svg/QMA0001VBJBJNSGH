import Redis from "ioredis";
import { REDIS_EVENTS_CHANNEL } from "@nexusbot/shared";
import { env } from "../config/env";
import { childLogger } from "./logger";

const log = childLogger("redis");

/**
 * `nexus:bot-commands` — API -> bot command channel.
 *
 * apps/bot (built independently) subscribes to this channel and executes the
 * requested Discord action. This is the *only* channel the API uses to ask
 * the bot to mutate live Discord state (bans, kicks, timeouts, etc.) — the
 * API never talks to the Discord REST API directly for guild actions.
 *
 * Payload contract (kept intentionally simple / stable):
 *   {
 *     action: "ban" | "kick" | "timeout" | "warn",
 *     guildId: string,
 *     targetId: string,
 *     moderatorId: string,
 *     reason?: string,
 *     durationSeconds?: number,
 *   }
 */
export const BOT_COMMANDS_CHANNEL = "nexus:bot-commands";

export interface BotCommandPayload {
  action: "ban" | "kick" | "timeout" | "warn" | "softban" | "tempban" | "unban" | "unmute";
  guildId: string;
  targetId: string;
  moderatorId: string;
  reason?: string;
  durationSeconds?: number;
}

// General-purpose client: caching (GET/SET), rate limiting store, etc.
export const redisClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// Dedicated publisher (ioredis recommends separate connections for pub/sub vs commands).
export const redisPublisher = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// Dedicated subscriber — once a connection issues SUBSCRIBE it can't run other commands.
export const redisSubscriber = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

for (const [name, client] of Object.entries({
  cache: redisClient,
  publisher: redisPublisher,
  subscriber: redisSubscriber,
})) {
  client.on("error", (err) => log.error({ err, client: name }, "Redis client error"));
  client.on("connect", () => log.info({ client: name }, "Redis client connected"));
}

export async function connectRedis(): Promise<void> {
  await Promise.all(
    [redisClient, redisPublisher, redisSubscriber].map(async (client) => {
      if (client.status === "ready" || client.status === "connecting") return;
      await client.connect();
    }),
  );
}

export async function disconnectRedis(): Promise<void> {
  await Promise.all(
    [redisClient, redisPublisher, redisSubscriber].map(async (client) => {
      if (client.status === "end") return;
      await client.quit();
    }),
  );
}

/**
 * Publishes a bot command envelope to BOT_COMMANDS_CHANNEL. Used by dashboard-
 * initiated moderation actions (POST /guilds/:id/moderation/:action) so the
 * bot (source of truth for live Discord state) can execute the real action.
 */
export async function publishBotCommand(payload: BotCommandPayload): Promise<void> {
  try {
    await redisPublisher.publish(BOT_COMMANDS_CHANNEL, JSON.stringify(payload));
  } catch (err) {
    log.error({ err, payload }, "Failed to publish bot command");
  }
}

/**
 * Subscribes to REDIS_EVENTS_CHANNEL (published by apps/bot) and invokes the
 * provided handler for every envelope received. Wired up in src/lib/socket.ts
 * to relay envelopes into Socket.IO rooms.
 */
export async function subscribeToRealtimeEvents(
  handler: (raw: string) => void,
): Promise<void> {
  if (redisSubscriber.status !== "ready" && redisSubscriber.status !== "connecting") {
    await redisSubscriber.connect();
  }
  await redisSubscriber.subscribe(REDIS_EVENTS_CHANNEL);
  redisSubscriber.on("message", (channel, message) => {
    if (channel !== REDIS_EVENTS_CHANNEL) return;
    handler(message);
  });
  log.info({ channel: REDIS_EVENTS_CHANNEL }, "Subscribed to realtime events channel");
}
