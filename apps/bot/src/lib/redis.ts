import Redis from "ioredis";
import { REDIS_EVENTS_CHANNEL, RealtimeEvent, type RealtimeEnvelope } from "@nexusbot/shared";
import { env } from "../config/env";
import { childLogger } from "./logger";

const log = childLogger("redis");

export const redisPublisher = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redisPublisher.on("error", (err) => {
  log.error({ err }, "Redis publisher error");
});

redisPublisher.on("connect", () => {
  log.info("Redis publisher connected");
});

export async function connectRedis(): Promise<void> {
  if (redisPublisher.status === "ready" || redisPublisher.status === "connecting") return;
  await redisPublisher.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (redisPublisher.status === "end") return;
  await redisPublisher.quit();
}

/**
 * Publishes a RealtimeEnvelope<T> to the shared Redis pub/sub channel.
 * apps/api subscribes to REDIS_EVENTS_CHANNEL and relays to Socket.IO rooms.
 */
export async function publishRealtimeEvent<T = unknown>(
  event: RealtimeEvent,
  guildId: string,
  data: T,
): Promise<void> {
  const envelope: RealtimeEnvelope<T> = {
    event,
    guildId,
    timestamp: new Date().toISOString(),
    data,
  };
  try {
    await redisPublisher.publish(REDIS_EVENTS_CHANNEL, JSON.stringify(envelope));
  } catch (err) {
    log.error({ err, event, guildId }, "Failed to publish realtime event");
  }
}
