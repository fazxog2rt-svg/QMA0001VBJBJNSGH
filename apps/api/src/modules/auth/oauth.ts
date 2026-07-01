import axios from "axios";
import { env } from "../../config/env";
import { ApiError } from "../../middleware/errorHandler";

export interface DiscordUserProfile {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  email: string | null;
}

export interface GoogleUserProfile {
  sub: string;
  name: string;
  picture: string | null;
  email: string | null;
}

export function buildDiscordAuthorizeUrl(state: string): string {
  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_REDIRECT_URI) {
    throw ApiError.internal("Discord OAuth is not configured");
  }
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    redirect_uri: env.DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify email",
    state,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeDiscordCode(code: string): Promise<DiscordUserProfile> {
  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.DISCORD_REDIRECT_URI) {
    throw ApiError.internal("Discord OAuth is not configured");
  }
  const tokenResp = await axios.post(
    "https://discord.com/api/oauth2/token",
    new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: env.DISCORD_REDIRECT_URI,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );
  const accessToken = tokenResp.data.access_token as string;

  const userResp = await axios.get<DiscordUserProfile>("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return userResp.data;
}

export function buildGoogleAuthorizeUrl(state: string): string {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
    throw ApiError.internal("Google OAuth is not configured");
  }
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<GoogleUserProfile> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw ApiError.internal("Google OAuth is not configured");
  }
  const tokenResp = await axios.post(
    "https://oauth2.googleapis.com/token",
    new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );
  const accessToken = tokenResp.data.access_token as string;

  const userResp = await axios.get<GoogleUserProfile>(
    "https://openidconnect.googleapis.com/v1/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return userResp.data;
}
