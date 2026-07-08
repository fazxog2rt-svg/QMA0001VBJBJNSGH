/** Konstanta & tabel hadiah Battle Pass musiman. */

export const XP_PER_TIER = 500;
export const MAX_TIER = 50;
export const PREMIUM_COST = 25_000; // coins untuk membuka jalur premium

/** Tier dari total Season XP (dibatasi MAX_TIER). */
export function tierFromXp(xp: number): number {
  return Math.min(MAX_TIER, Math.floor(Math.max(0, xp) / XP_PER_TIER));
}

/** Coins hadiah jalur GRATIS untuk sebuah tier (tier kelipatan 10 = bonus besar). */
export function freeTierReward(tier: number): number {
  if (tier <= 0) return 0;
  return 100 + (tier % 10 === 0 ? 1000 : 0);
}

/** Coins hadiah TAMBAHAN jalur premium untuk sebuah tier. */
export function premiumTierReward(tier: number): number {
  if (tier <= 0) return 0;
  return 150 + (tier % 10 === 0 ? 1500 : 0);
}

export interface MissionTemplate {
  key: string;
  label: string;
  type: "pesan" | "kuis" | "harian" | "sumbang";
  target: number;
  xp: number;
}

export const DAILY_MISSIONS: MissionTemplate[] = [
  { key: "pesan20", label: "Kirim 20 pesan", type: "pesan", target: 20, xp: 150 },
  { key: "kuis1", label: "Menang 1 kuis Cerdas Cermat", type: "kuis", target: 1, xp: 200 },
  { key: "harian1", label: "Klaim hadiah /daily", type: "harian", target: 1, xp: 100 },
];

export const WEEKLY_MISSIONS: MissionTemplate[] = [
  { key: "pesan200", label: "Kirim 200 pesan pekan ini", type: "pesan", target: 200, xp: 800 },
  { key: "kuis5", label: "Menang 5 kuis pekan ini", type: "kuis", target: 5, xp: 1000 },
  { key: "sumbang1", label: "Sumbang ke faksi 1×", type: "sumbang", target: 1, xp: 400 },
];
