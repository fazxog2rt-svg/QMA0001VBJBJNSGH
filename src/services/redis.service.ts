import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "./logger.service";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on("error", (error) => {
  logger.error("Redis connection error", { error: error.message });
});

redis.on("connect", () => {
  logger.info("Redis connected");
});

export async function connectRedis(): Promise<void> {
  if (redis.status === "ready" || redis.status === "connecting") return;
  await redis.connect();
}

export async function disconnectRedis(): Promise<void> {
  redis.disconnect();
}
