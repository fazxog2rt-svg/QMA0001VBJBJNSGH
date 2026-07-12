import { env } from "../config/env";

const API = "https://discord.com/api/v10";
const MANAGE_GUILD = 0x20n;
const ADMINISTRATOR = 0x8n;

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar: string | null;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export function redirectUri(): string {
  const base = (env.DASHBOARD_BASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/callback`;
}

/** URL untuk memulai login OAuth2 Discord. */
export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "identify guilds",
    state,
    prompt: "consent",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/** Tukar authorization code dengan access token. */
export async function exchangeCode(code: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    client_secret: env.DISCORD_CLIENT_SECRET ?? "",
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
  });

  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange gagal: HTTP ${res.status}`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Access token kosong.");
  return data.access_token;
}

async function apiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Discord API ${path} gagal: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export function fetchUser(token: string): Promise<DiscordUser> {
  return apiGet<DiscordUser>("/users/@me", token);
}

export function fetchGuilds(token: string): Promise<DiscordGuild[]> {
  return apiGet<DiscordGuild[]>("/users/@me/guilds", token);
}

/** Apakah user punya izin Manage Server (atau owner/admin) pada guild ini? */
export function canManageGuild(guild: DiscordGuild): boolean {
  if (guild.owner) return true;
  try {
    const perms = BigInt(guild.permissions);
    return (perms & MANAGE_GUILD) === MANAGE_GUILD || (perms & ADMINISTRATOR) === ADMINISTRATOR;
  } catch {
    return false;
  }
}
