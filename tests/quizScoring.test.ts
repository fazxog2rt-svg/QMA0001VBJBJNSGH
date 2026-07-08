import { describe, expect, it } from "vitest";
import { scoreAnswer } from "../src/services/fun/quizScoring";

describe("scoreAnswer", () => {
  const TOTAL = 20_000;

  it("memberi poin dasar 100 walau jawab di detik terakhir tanpa streak", () => {
    expect(scoreAnswer(0, TOTAL, 0)).toBe(100);
  });

  it("menambah bonus kecepatan penuh saat menjawab instan", () => {
    // msRemaining == total → bonus kecepatan 100.
    expect(scoreAnswer(TOTAL, TOTAL, 0)).toBe(200);
  });

  it("memberi setengah bonus kecepatan pada pertengahan waktu", () => {
    expect(scoreAnswer(TOTAL / 2, TOTAL, 0)).toBe(150);
  });

  it("menambah bonus rentetan (streak) hingga maksimum +100", () => {
    expect(scoreAnswer(0, TOTAL, 3)).toBe(100 + 60);
    // streak besar dibatasi pada 5 (100 poin bonus).
    expect(scoreAnswer(0, TOTAL, 99)).toBe(100 + 100);
  });

  it("mengabaikan nilai waktu negatif atau di luar rentang", () => {
    expect(scoreAnswer(-500, TOTAL, 0)).toBe(100);
    expect(scoreAnswer(TOTAL * 5, TOTAL, 0)).toBe(200);
  });
});
