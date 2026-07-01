import jwt from "jsonwebtoken";
import type { JwtPayload, PlatformRole } from "@nexusbot/shared";
import { JWT_ACCESS_TOKEN_TTL, JWT_REFRESH_TOKEN_TTL_DAYS } from "@nexusbot/shared";
import { env } from "../config/env";

export interface AccessTokenClaims {
  sub: string;
  role: PlatformRole;
  sessionId: string;
}

export interface RefreshTokenClaims {
  sub: string;
  sessionId: string;
}

/** Signs a short-lived (15m) access token, embedding the JwtPayload contract. */
export function signAccessToken(claims: AccessTokenClaims): string {
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, { expiresIn: JWT_ACCESS_TOKEN_TTL });
}

/** Signs a long-lived (30d) refresh token. The raw value is only ever stored hashed in Session.refreshToken. */
export function signRefreshToken(claims: RefreshTokenClaims): string {
  return jwt.sign(claims, env.JWT_REFRESH_SECRET, {
    expiresIn: `${JWT_REFRESH_TOKEN_TTL_DAYS}d`,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenClaims & jwt.JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenClaims & jwt.JwtPayload;
}

export const REFRESH_TOKEN_TTL_MS = JWT_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
