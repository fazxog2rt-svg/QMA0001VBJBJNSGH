import type { NextFunction, Request, Response } from "express";
import { prisma } from "@nexusbot/database";
import type { JwtPayload, PlatformRole } from "@nexusbot/shared";
import { verifyAccessToken } from "../lib/jwt";
import { ApiError } from "./errorHandler";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * CSRF strategy: since auth state lives in httpOnly cookies, we require the
 * `X-Requested-With: XMLHttpRequest` header on every state-changing request
 * (POST/PATCH/PUT/DELETE). Plain cross-site <form> submissions and simple
 * <img>/navigation-based CSRF cannot set custom headers, so this blocks the
 * classic CSRF vector without needing a separate token round-trip. This is
 * the same approach used by many SPA APIs (Rails/Django/Google use header
 * checks similarly) and pairs with `SameSite=Lax` cookies set in auth routes.
 */
export function csrfHeaderGuard(req: Request, res: Response, next: NextFunction) {
  const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
  if (safeMethods.has(req.method)) return next();
  if (req.headers["x-requested-with"]) return next();
  // Allow Bearer/API-key authenticated requests (non-browser clients) through —
  // the header guard only protects the cookie-based session flow.
  if (req.headers.authorization) return next();
  next(ApiError.forbidden("Missing X-Requested-With header (CSRF protection)"));
}

function extractAccessToken(req: Request): string | undefined {
  const cookieToken = req.cookies?.access_token as string | undefined;
  if (cookieToken) return cookieToken;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return undefined;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractAccessToken(req);
  if (!token) return next(ApiError.unauthorized("Missing access token"));
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired access token"));
  }
}

/** Same as requireAuth, but does not fail when no token is present. */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractAccessToken(req);
  if (!token) return next();
  try {
    req.user = verifyAccessToken(token);
  } catch {
    // ignore invalid token, proceed unauthenticated
  }
  next();
}

export function requireRole(...roles: PlatformRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden("Insufficient platform role"));
    }
    next();
  };
}

/**
 * Requires the caller to either be platform ADMIN/OWNER, or hold a
 * GuildStaff row for the :id / :guildId route param.
 */
export async function requireGuildStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return next(ApiError.unauthorized());
  const guildId = req.params.id ?? req.params.guildId;
  if (!guildId) return next(ApiError.badRequest("Missing guild id in route"));

  if (req.user.role === "ADMIN" || req.user.role === "OWNER") return next();

  try {
    const staff = await prisma.guildStaff.findUnique({
      where: { guildId_userId: { guildId, userId: req.user.sub } },
    });
    if (!staff) return next(ApiError.forbidden("You are not staff on this guild"));
    next();
  } catch (err) {
    next(err);
  }
}

/** Requires guild staff with at least ADMIN/OWNER staff role (not plain MODERATOR). */
export async function requireGuildAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return next(ApiError.unauthorized());
  const guildId = req.params.id ?? req.params.guildId;
  if (!guildId) return next(ApiError.badRequest("Missing guild id in route"));

  if (req.user.role === "ADMIN" || req.user.role === "OWNER") return next();

  try {
    const staff = await prisma.guildStaff.findUnique({
      where: { guildId_userId: { guildId, userId: req.user.sub } },
    });
    if (!staff || staff.role === "MODERATOR") {
      return next(ApiError.forbidden("Requires guild admin/owner staff role"));
    }
    next();
  } catch (err) {
    next(err);
  }
}
