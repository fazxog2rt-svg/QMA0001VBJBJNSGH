import { describe, expect, it } from "vitest";
import { levelFromXp, totalXpForLevel, xpForLevel } from "../src/config/constants";
import { formatDurationMs } from "../src/utils/formatDuration";

describe("totalXpForLevel", () => {
  it("is 0 for level 0", () => {
    expect(totalXpForLevel(0)).toBe(0);
  });

  it("is the cumulative sum of xpForLevel", () => {
    expect(totalXpForLevel(1)).toBe(xpForLevel(0));
    expect(totalXpForLevel(3)).toBe(xpForLevel(0) + xpForLevel(1) + xpForLevel(2));
  });

  it("is consistent with levelFromXp at boundaries", () => {
    for (let level = 0; level < 10; level += 1) {
      expect(levelFromXp(totalXpForLevel(level))).toBe(level);
    }
  });
});

describe("formatDurationMs", () => {
  it("formats minutes only", () => {
    expect(formatDurationMs(5 * 60_000)).toBe("5 menit");
  });

  it("formats hours only", () => {
    expect(formatDurationMs(2 * 3_600_000)).toBe("2 jam");
  });

  it("formats hours and minutes", () => {
    expect(formatDurationMs(2 * 3_600_000 + 30 * 60_000)).toBe("2 jam 30 menit");
  });
});
