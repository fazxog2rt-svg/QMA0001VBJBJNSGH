const DURATION_PATTERN = /(\d+)\s*(d|h|m|s)/gi;

const UNIT_TO_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parses a duration string like "1d2h30m" or "45m" into milliseconds. Returns null if invalid/empty. */
export function parseDurationMs(input: string): number | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  let totalMs = 0;
  let matched = false;

  for (const match of trimmed.matchAll(DURATION_PATTERN)) {
    const [, amount, unit] = match as unknown as [string, string, string];
    totalMs += Number(amount) * UNIT_TO_MS[unit]!;
    matched = true;
  }

  if (!matched) return null;
  return totalMs;
}
