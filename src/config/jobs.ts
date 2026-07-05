/** Daftar pekerjaan untuk sistem /job. Payout /work mengikuti min–max pekerjaan. */
export const JOBS = [
  { key: "programmer", label: "Programmer", emoji: "💻", min: 150, max: 400 },
  { key: "youtuber", label: "YouTuber", emoji: "🎥", min: 80, max: 550 },
  { key: "chef", label: "Chef", emoji: "🍳", min: 120, max: 350 },
  { key: "ojol", label: "Ojek Online", emoji: "🛵", min: 100, max: 300 },
  { key: "designer", label: "Desainer Grafis", emoji: "🎨", min: 130, max: 380 },
  { key: "streamer", label: "Streamer", emoji: "🎮", min: 90, max: 500 },
  { key: "dokter", label: "Dokter", emoji: "🩺", min: 200, max: 450 },
  { key: "petani", label: "Petani", emoji: "🌾", min: 110, max: 320 },
] as const;

export type JobKey = (typeof JOBS)[number]["key"];

export function getJob(key: string | null | undefined): (typeof JOBS)[number] | undefined {
  return JOBS.find((job) => job.key === key);
}
