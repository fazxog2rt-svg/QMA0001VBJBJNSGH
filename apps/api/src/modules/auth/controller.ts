import type { Request, Response } from "express";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { nanoid } from "nanoid";
import { prisma } from "@nexusbot/database";
import { emailLoginSchema, emailRegisterSchema } from "@nexusbot/shared";
import { hashPassword, verifyPassword, generateBackupCodes } from "../../lib/security";
import { ApiError } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../middleware/auditLog";
import { setAuthCookies, clearAuthCookies } from "./cookies";
import { issueSession, rotateSession, revokeSession, findOrCreateOAuthUser } from "./service";
import {
  buildDiscordAuthorizeUrl,
  buildGoogleAuthorizeUrl,
  exchangeDiscordCode,
  exchangeGoogleCode,
} from "./oauth";

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  twoFactorEnabled: true,
  createdAt: true,
} as const;

export async function register(req: Request, res: Response) {
  const { email, username, password } = emailRegisterSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      accounts: { create: { provider: "EMAIL", providerAccountId: email } },
    },
  });

  const tokens = await issueSession(user, req);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  await writeAuditLog({ actorId: user.id, actorTag: user.username, action: "auth.register", req });

  res.status(201).json({ user: sanitizeUser(user) });
}

export async function login(req: Request, res: Response) {
  const { email, password, totpCode } = emailLoginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) throw ApiError.unauthorized("Invalid email or password");
  if (user.isBlacklisted) throw ApiError.forbidden("Account is blacklisted");

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized("Invalid email or password");

  if (user.twoFactorEnabled) {
    if (!totpCode) {
      res.status(401).json({
        error: { code: "TOTP_REQUIRED", message: "Two-factor authentication code required" },
      });
      return;
    }
    const validTotp = user.twoFactorSecret && authenticator.check(totpCode, user.twoFactorSecret);
    const validBackup = user.twoFactorBackupCodes.includes(totpCode.toUpperCase());
    if (!validTotp && !validBackup) {
      throw ApiError.unauthorized("Invalid two-factor code");
    }
    if (validBackup) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorBackupCodes: user.twoFactorBackupCodes.filter(
            (c: string) => c !== totpCode.toUpperCase(),
          ),
        },
      });
    }
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const tokens = await issueSession(user, req);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  await writeAuditLog({ actorId: user.id, actorTag: user.username, action: "auth.login", req });

  res.status(200).json({ user: sanitizeUser(user) });
}

export function discordAuthorize(req: Request, res: Response) {
  const state = nanoid(24);
  res.cookie("oauth_state", state, { httpOnly: true, maxAge: 5 * 60 * 1000, sameSite: "lax" });
  res.redirect(buildDiscordAuthorizeUrl(state));
}

export async function discordCallback(req: Request, res: Response) {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const cookieState = req.cookies?.oauth_state as string | undefined;
  if (!code) throw ApiError.badRequest("Missing OAuth code");
  if (!state || !cookieState || state !== cookieState) {
    throw ApiError.badRequest("Invalid or missing OAuth state (possible CSRF)");
  }

  const profile = await exchangeDiscordCode(code);
  const user = await findOrCreateOAuthUser({
    provider: "DISCORD",
    providerAccountId: profile.id,
    email: profile.email,
    username: profile.global_name ?? profile.username,
    avatarUrl: profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
      : null,
  });

  if (user.isBlacklisted) throw ApiError.forbidden("Account is blacklisted");

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const tokens = await issueSession(user, req);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.clearCookie("oauth_state");
  await writeAuditLog({ actorId: user.id, actorTag: user.username, action: "auth.login.discord", req });

  res.redirect(dashboardRedirectUrl());
}

export function googleAuthorize(req: Request, res: Response) {
  const state = nanoid(24);
  res.cookie("oauth_state", state, { httpOnly: true, maxAge: 5 * 60 * 1000, sameSite: "lax" });
  res.redirect(buildGoogleAuthorizeUrl(state));
}

export async function googleCallback(req: Request, res: Response) {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const cookieState = req.cookies?.oauth_state as string | undefined;
  if (!code) throw ApiError.badRequest("Missing OAuth code");
  if (!state || !cookieState || state !== cookieState) {
    throw ApiError.badRequest("Invalid or missing OAuth state (possible CSRF)");
  }

  const profile = await exchangeGoogleCode(code);
  const user = await findOrCreateOAuthUser({
    provider: "GOOGLE",
    providerAccountId: profile.sub,
    email: profile.email,
    username: profile.name,
    avatarUrl: profile.picture,
  });

  if (user.isBlacklisted) throw ApiError.forbidden("Account is blacklisted");

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const tokens = await issueSession(user, req);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.clearCookie("oauth_state");
  await writeAuditLog({ actorId: user.id, actorTag: user.username, action: "auth.login.google", req });

  res.redirect(dashboardRedirectUrl());
}

function dashboardRedirectUrl(): string {
  const origin = process.env.CORS_ORIGIN?.split(",")[0]?.trim() ?? "http://localhost:3000";
  return `${origin}/dashboard`;
}

export async function setup2fa(req: Request, res: Response) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.sub } });
  if (user.twoFactorEnabled) throw ApiError.conflict("Two-factor authentication is already enabled");

  const secret = authenticator.generateSecret();
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret } });

  const otpauth = authenticator.keyuri(user.email ?? user.username, "NexusBot", secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

  res.status(200).json({ secret, otpauth, qrCodeDataUrl });
}

export async function verify2fa(req: Request, res: Response) {
  const { totpCode } = req.body as { totpCode: string };
  if (!totpCode) throw ApiError.badRequest("totpCode is required");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.sub } });
  if (!user.twoFactorSecret) throw ApiError.badRequest("Run /auth/2fa/setup first");

  const valid = authenticator.check(totpCode, user.twoFactorSecret);
  if (!valid) throw ApiError.unauthorized("Invalid two-factor code");

  const backupCodes = generateBackupCodes();
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true, twoFactorBackupCodes: backupCodes },
  });
  await writeAuditLog({ actorId: user.id, actorTag: user.username, action: "auth.2fa.enabled", req });

  res.status(200).json({ enabled: true, backupCodes });
}

export async function disable2fa(req: Request, res: Response) {
  const { totpCode } = req.body as { totpCode: string };
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.sub } });
  if (!user.twoFactorEnabled) throw ApiError.conflict("Two-factor authentication is not enabled");

  const valid = user.twoFactorSecret && totpCode && authenticator.check(totpCode, user.twoFactorSecret);
  if (!valid) throw ApiError.unauthorized("Invalid two-factor code");

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [] },
  });
  await writeAuditLog({ actorId: user.id, actorTag: user.username, action: "auth.2fa.disabled", req });

  res.status(200).json({ enabled: false });
}

export async function refresh(req: Request, res: Response) {
  const rawRefreshToken = req.cookies?.refresh_token as string | undefined;
  if (!rawRefreshToken) throw ApiError.unauthorized("Missing refresh token");

  const tokens = await rotateSession(rawRefreshToken, req);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.status(200).json({ refreshed: true });
}

export async function logout(req: Request, res: Response) {
  if (req.user) {
    await revokeSession(req.user.sessionId, req.user.sub);
    await writeAuditLog({ actorId: req.user.sub, action: "auth.logout", req });
  }
  clearAuthCookies(res);
  res.status(200).json({ loggedOut: true });
}

export async function listSessions(req: Request, res: Response) {
  const sessions = await prisma.session.findMany({
    where: { userId: req.user!.sub },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      expiresAt: true,
      revokedAt: true,
    },
  });
  res.status(200).json({
    sessions: sessions.map((s: { id: string }) => ({ ...s, current: s.id === req.user!.sessionId })),
  });
}

export async function revokeSessionById(req: Request, res: Response) {
  const { id } = req.params;
  await revokeSession(id, req.user!.sub);
  res.status(200).json({ revoked: true });
}

function sanitizeUser(user: { id: string; email: string | null; username: string; displayName: string | null; avatarUrl: string | null; role: string; twoFactorEnabled: boolean; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
  };
}

export { PUBLIC_USER_SELECT };
