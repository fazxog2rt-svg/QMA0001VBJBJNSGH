export type LoopMode = "off" | "track" | "queue";

export interface Track {
  title: string;
  url: string;
  thumbnail?: string;
  durationSec: number;
  durationLabel: string;
  requestedById: string;
  requestedByTag: string;
}

/** Format detik menjadi label mm:ss atau hh:mm:ss. */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "LIVE";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
