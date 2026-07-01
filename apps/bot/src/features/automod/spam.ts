/**
 * Sliding-window message-rate spam detector. Pure function, in-memory state
 * keyed by `${guildId}:${userId}`. No DB/Discord calls here — the orchestrator
 * decides what to do with a positive detection.
 */

interface WindowEntry {
  timestamps: number[];
}

const WINDOW_MS = 7_000;
const DEFAULT_THRESHOLD = 6; // messages within WINDOW_MS

const state = new Map<string, WindowEntry>();

export interface SpamCheckResult {
  triggered: boolean;
  count: number;
}

export function checkSpam(
  guildId: string,
  userId: string,
  threshold: number = DEFAULT_THRESHOLD,
  windowMs: number = WINDOW_MS,
): SpamCheckResult {
  const key = `${guildId}:${userId}`;
  const now = Date.now();
  const entry = state.get(key) ?? { timestamps: [] };

  entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);
  entry.timestamps.push(now);
  state.set(key, entry);

  return { triggered: entry.timestamps.length >= threshold, count: entry.timestamps.length };
}

export function resetSpamState(guildId: string, userId: string): void {
  state.delete(`${guildId}:${userId}`);
}
