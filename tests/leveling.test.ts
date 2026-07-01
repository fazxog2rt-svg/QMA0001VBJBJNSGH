import { describe, expect, it } from "vitest";
import { levelFromXp, xpForLevel } from "../src/config/constants";

describe("leveling curve", () => {
  it("computes xp required per level using a quadratic curve", () => {
    expect(xpForLevel(0)).toBe(100);
    expect(xpForLevel(1)).toBe(155);
  });

  it("derives level from total accumulated xp", () => {
    expect(levelFromXp(0)).toBe(0);
    expect(levelFromXp(99)).toBe(0);
    expect(levelFromXp(100)).toBe(1);
    expect(levelFromXp(100 + 155)).toBe(2);
  });
});
