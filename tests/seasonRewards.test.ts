import { describe, expect, it } from "vitest";
import {
  MAX_TIER,
  XP_PER_TIER,
  freeTierReward,
  premiumTierReward,
  tierFromXp,
} from "../src/config/season";

describe("tierFromXp", () => {
  it("tier 0 di bawah satu tier penuh", () => {
    expect(tierFromXp(0)).toBe(0);
    expect(tierFromXp(XP_PER_TIER - 1)).toBe(0);
  });

  it("naik satu tier tiap XP_PER_TIER", () => {
    expect(tierFromXp(XP_PER_TIER)).toBe(1);
    expect(tierFromXp(XP_PER_TIER * 3 + 10)).toBe(3);
  });

  it("dibatasi MAX_TIER dan mengabaikan XP negatif", () => {
    expect(tierFromXp(XP_PER_TIER * (MAX_TIER + 5))).toBe(MAX_TIER);
    expect(tierFromXp(-999)).toBe(0);
  });
});

describe("reward tiers", () => {
  it("tier <= 0 tidak memberi hadiah", () => {
    expect(freeTierReward(0)).toBe(0);
    expect(premiumTierReward(0)).toBe(0);
  });

  it("tier kelipatan 10 memberi bonus besar", () => {
    expect(freeTierReward(10)).toBeGreaterThan(freeTierReward(9));
    expect(premiumTierReward(20)).toBeGreaterThan(premiumTierReward(19));
  });

  it("premium selalu memberi lebih dari gratis di tier sama", () => {
    for (const tier of [1, 5, 10, 25, 50]) {
      expect(premiumTierReward(tier)).toBeGreaterThan(freeTierReward(tier));
    }
  });
});
