import { redis } from "./redis.service";
import { logger } from "./logger.service";

/**
 * Read-through cache helper backed by Redis. Falls back to the loader (and never
 * throws) if Redis is unavailable, so caching is a pure optimization — the bot
 * keeps working even if the cache layer is down.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit !== null) {
      return JSON.parse(hit) as T;
    }
  } catch (error) {
    logger.warn("Cache read gagal, fallback ke loader", {
      key,
      error: error instanceof Error ? error.message : error,
    });
  }

  const value = await loader();

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (error) {
    logger.warn("Cache write gagal", {
      key,
      error: error instanceof Error ? error.message : error,
    });
  }

  return value;
}

export async function invalidateCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    logger.warn("Cache invalidate gagal", {
      key,
      error: error instanceof Error ? error.message : error,
    });
  }
}
