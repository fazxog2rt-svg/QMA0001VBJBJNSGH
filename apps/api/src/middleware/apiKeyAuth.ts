import type { NextFunction, Request, Response } from "express";
import { prisma } from "@nexusbot/database";
import { API_KEY_PREFIX } from "@nexusbot/shared";
import { sha256 } from "../lib/security";
import { ApiError } from "./errorHandler";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      apiKey?: { id: string; userId: string; scopes: string[] };
    }
  }
}

/**
 * Authenticates requests to the `public` module via `Authorization: Bearer nxb_...`.
 * Looks the key up by its SHA-256 hash (never stores/compares plaintext),
 * rejects revoked/expired keys, and updates lastUsedAt for observability.
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Missing API key"));
  }
  const plaintext = header.slice(7).trim();
  if (!plaintext.startsWith(API_KEY_PREFIX)) {
    return next(ApiError.unauthorized("Malformed API key"));
  }

  try {
    const keyHash = sha256(plaintext);
    const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });
    if (!apiKey) return next(ApiError.unauthorized("Invalid API key"));
    if (apiKey.revokedAt) return next(ApiError.unauthorized("API key has been revoked"));
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return next(ApiError.unauthorized("API key has expired"));
    }

    req.apiKey = { id: apiKey.id, userId: apiKey.userId, scopes: apiKey.scopes };

    // Fire-and-forget lastUsedAt update — don't block the request on it.
    prisma.apiKey
      .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    next();
  } catch (err) {
    next(err);
  }
}
