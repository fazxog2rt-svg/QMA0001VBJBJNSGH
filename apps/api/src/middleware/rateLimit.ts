import rateLimit, { type Request, type Response } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import type { ApiErrorBody } from "@nexusbot/shared";
import { DEFAULT_RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_WINDOW_MS } from "@nexusbot/shared";
import { redisClient } from "../lib/redis";

function jsonRateLimitHandler(req: Request, res: Response) {
  const body: ApiErrorBody = {
    error: { code: "TOO_MANY_REQUESTS", message: "Too many requests, please slow down." },
  };
  res.status(429).json(body);
}

function redisStore(prefix: string) {
  return new RedisStore({
    // rate-limit-redis v4 expects a `sendCommand` that proxies to ioredis.
    sendCommand: (...args: string[]) => redisClient.call(...(args as [string, ...string[]])) as Promise<unknown>,
    prefix,
  });
}

/** General API rate limiter — applied globally. */
export const generalRateLimiter = rateLimit({
  windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS,
  limit: DEFAULT_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore("rl:general:"),
  handler: jsonRateLimitHandler,
});

/** Stricter limiter for /auth/* — mitigates credential stuffing / brute force. */
export const authRateLimiter = rateLimit({
  windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore("rl:auth:"),
  handler: jsonRateLimitHandler,
});

/** Very strict limiter for password/2FA verification attempts specifically. */
export const sensitiveAuthRateLimiter = rateLimit({
  windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore("rl:auth-sensitive:"),
  handler: jsonRateLimitHandler,
});
