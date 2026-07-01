import type { Response } from "express";
import { JWT_REFRESH_TOKEN_TTL_DAYS } from "@nexusbot/shared";
import { env, isProduction } from "../../config/env";

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // 15m, mirrors JWT_ACCESS_TOKEN_TTL
const REFRESH_TOKEN_MAX_AGE_MS = JWT_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/",
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie("access_token", accessToken, {
    ...baseCookieOptions(),
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  });
  res.cookie("refresh_token", refreshToken, {
    ...baseCookieOptions(),
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("access_token", baseCookieOptions());
  res.clearCookie("refresh_token", baseCookieOptions());
}
