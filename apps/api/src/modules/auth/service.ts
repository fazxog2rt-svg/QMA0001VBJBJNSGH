import type { Request } from "express";
import { prisma } from "@nexusbot/database";
import type { AccountProvider, User } from "@nexusbot/database";
import { sha256 } from "../../lib/security";
import { signAccessToken, signRefreshToken, verifyRefreshToken, REFRESH_TOKEN_TTL_MS } from "../../lib/jwt";
import { ApiError } from "../../middleware/errorHandler";

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Creates a Session row + signs a fresh access/refresh token pair. The
 * refresh token is stored hashed (Session.refreshToken) so a leaked DB dump
 * cannot be used to mint new sessions.
 */
export async function issueSession(user: Pick<User, "id" | "role">, req: Request): Promise<IssuedTokens> {
  const sessionId = crypto.randomUUID();
  const refreshToken = signRefreshToken({ sub: user.id, sessionId });
  const accessToken = signAccessToken({ sub: user.id, role: user.role, sessionId });

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      refreshToken: sha256(refreshToken),
      userAgent: req.headers["user-agent"]?.slice(0, 512),
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return { accessToken, refreshToken };
}

/**
 * Rotates a refresh token: verifies signature + looks up the hashed session,
 * rejects revoked/expired sessions, revokes the old session and issues a
 * brand-new session + token pair (rotation prevents replay of stolen tokens).
 */
export async function rotateSession(rawRefreshToken: string, req: Request): Promise<IssuedTokens> {
  let claims;
  try {
    claims = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  const session = await prisma.session.findUnique({ where: { id: claims.sessionId } });
  if (!session || session.refreshToken !== sha256(rawRefreshToken)) {
    throw ApiError.unauthorized("Refresh token not recognized");
  }
  if (session.revokedAt) throw ApiError.unauthorized("Session has been revoked");
  if (session.expiresAt < new Date()) throw ApiError.unauthorized("Session has expired");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) throw ApiError.unauthorized("User no longer exists");
  if (user.isBlacklisted) throw ApiError.forbidden("Account is blacklisted");

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  return issueSession(user, req);
}

export async function revokeSession(sessionId: string, userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Finds or creates a User+Account pair for an OAuth login (Discord/Google).
 * If a User with the same verified email already exists, the new provider
 * account is linked to it instead of creating a duplicate user.
 */
export async function findOrCreateOAuthUser(params: {
  provider: Extract<AccountProvider, "DISCORD" | "GOOGLE">;
  providerAccountId: string;
  email: string | null;
  username: string;
  avatarUrl: string | null;
}): Promise<User> {
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: params.provider,
        providerAccountId: params.providerAccountId,
      },
    },
    include: { user: true },
  });
  if (existingAccount) return existingAccount.user;

  const existingUser = params.email
    ? await prisma.user.findUnique({ where: { email: params.email } })
    : null;

  if (existingUser) {
    await prisma.account.create({
      data: {
        userId: existingUser.id,
        provider: params.provider,
        providerAccountId: params.providerAccountId,
      },
    });
    return existingUser;
  }

  const user = await prisma.user.create({
    data: {
      email: params.email,
      username: params.username,
      avatarUrl: params.avatarUrl,
      discordId: params.provider === "DISCORD" ? params.providerAccountId : undefined,
      emailVerified: params.email ? new Date() : null,
      accounts: {
        create: {
          provider: params.provider,
          providerAccountId: params.providerAccountId,
        },
      },
    },
  });
  return user;
}
