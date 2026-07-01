export const PREMIUM_LIMITS: Record<string, { maxAutoModRules: number; maxReactionRoles: number; aiRequestsPerDay: number; identityCardThemes: number }> = {
  FREE: { maxAutoModRules: 3, maxReactionRoles: 5, aiRequestsPerDay: 20, identityCardThemes: 2 },
  PREMIUM: { maxAutoModRules: 10, maxReactionRoles: 25, aiRequestsPerDay: 200, identityCardThemes: 8 },
  PREMIUM_PLUS: { maxAutoModRules: 25, maxReactionRoles: 100, aiRequestsPerDay: 1000, identityCardThemes: 20 },
  ENTERPRISE: { maxAutoModRules: 100, maxReactionRoles: 500, aiRequestsPerDay: 10000, identityCardThemes: 100 },
  LIFETIME: { maxAutoModRules: 100, maxReactionRoles: 500, aiRequestsPerDay: 10000, identityCardThemes: 100 },
};

export const XP_PER_MESSAGE_MIN = 15;
export const XP_PER_MESSAGE_MAX = 25;
export const XP_MESSAGE_COOLDOWN_SECONDS = 60;

export function xpForLevel(level: number): number {
  return 5 * level ** 2 + 50 * level + 100;
}

export function levelFromXp(xp: number): number {
  let level = 0;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  return level;
}

export const API_KEY_PREFIX = "nxb_";

export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_RATE_LIMIT_MAX = 120;

export const JWT_ACCESS_TOKEN_TTL = "15m";
export const JWT_REFRESH_TOKEN_TTL_DAYS = 30;

export const AGENT_TOKEN_PREFIX = "nxa_";
/** Agent is considered disconnected if no heartbeat arrives within this window. */
export const AGENT_HEARTBEAT_TIMEOUT_MS = 45_000;
export const AGENT_HEARTBEAT_INTERVAL_MS = 15_000;

export const IDENTITY_CARD_THEMES = [
  "default",
  "aurora",
  "midnight",
  "neon",
  "gold",
  "cyberpunk",
  "minimal",
  "military",
  "police",
  "corporate",
] as const;
