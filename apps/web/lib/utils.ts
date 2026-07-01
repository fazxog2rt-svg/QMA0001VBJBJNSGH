import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class lists, resolving conflicting utility classes. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Formats a number with thousands separators (e.g. 12345 -> "12,345"). */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/** Formats a number in compact notation (e.g. 12345 -> "12.3K"). */
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

/** Formats a bigint-like currency amount (cents/coins) with separators. */
export function formatCurrency(value: number | bigint, symbol = ""): string {
  const num = typeof value === "bigint" ? Number(value) : value;
  return `${symbol}${formatNumber(num)}`;
}

/** Formats seconds into a compact human-readable uptime string (e.g. "3d 4h 12m"). */
export function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(" ");
}

/** Formats bytes (MB input) into a human string, e.g. 1536 -> "1.5 GB". */
export function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

/** Truncates a string with an ellipsis. */
export function truncate(value: string, length = 48): string {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

/** Produces initials from a display name, e.g. "Nexus Bot" -> "NB". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Discord snowflake -> CDN avatar URL, falling back to a default avatar. */
export function discordAvatarUrl(userId: string, avatarHash?: string | null, size = 128): string {
  if (avatarHash) {
    const ext = avatarHash.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=${size}`;
  }
  const index = Number(BigInt(userId) % 5n);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
