/**
 * Logika penilaian kuis murni (tanpa dependensi AI/DB) agar mudah diuji.
 */

/** Poin untuk satu jawaban benar: dasar + bonus kecepatan + bonus rentetan. */
export function scoreAnswer(msRemaining: number, totalMs: number, streak: number): number {
  const base = 100;
  const speedBonus = Math.round(100 * Math.max(0, Math.min(1, msRemaining / totalMs)));
  const streakBonus = Math.min(streak, 5) * 20; // maksimal +100
  return base + speedBonus + streakBonus;
}
