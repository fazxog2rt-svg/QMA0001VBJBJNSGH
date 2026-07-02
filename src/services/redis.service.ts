import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "./logger.service";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  // Jangan antre command saat offline — biar cache.service langsung fallback ke DB
  // daripada menggantung menunggu koneksi yang mungkin tidak akan pernah pulih.
  enableOfflineQueue: false,
  // Berhenti mencoba menyambung ulang setelah 10 kali gagal supaya log tidak dibanjiri
  // error saat Redis benar-benar tidak tersedia (mis. REDIS_URL salah).
  retryStrategy: (times) => (times > 10 ? null : Math.min(times * 200, 2000)),
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
