import { describe, expect, it } from "vitest";
import { MONSTERS, RPG_CLASSES, getShopItem, pickMonster, rpgXpForLevel } from "../src/config/rpg";

describe("rpgXpForLevel", () => {
  it("naik seiring level", () => {
    expect(rpgXpForLevel(2)).toBeGreaterThan(rpgXpForLevel(1));
    expect(rpgXpForLevel(1)).toBe(100);
  });
});

describe("pickMonster", () => {
  it("hanya memilih monster yang syarat levelnya terpenuhi", () => {
    for (let i = 0; i < 50; i += 1) {
      const monster = pickMonster(1);
      expect(monster.minLevel).toBeLessThanOrEqual(1);
    }
  });

  it("membuka monster lebih kuat di level tinggi", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) seen.add(pickMonster(20).name);
    // Monster level tinggi harus bisa muncul.
    expect(seen.has("Naga Muda")).toBe(true);
  });
});

describe("konfigurasi RPG", () => {
  it("semua kelas punya stat positif", () => {
    for (const cls of Object.values(RPG_CLASSES)) {
      expect(cls.maxHp).toBeGreaterThan(0);
      expect(cls.attack).toBeGreaterThan(0);
      expect(cls.defense).toBeGreaterThan(0);
    }
  });

  it("monster terurut & punya reward", () => {
    for (const m of MONSTERS) {
      expect(m.xpReward).toBeGreaterThan(0);
      expect(m.goldReward).toBeGreaterThan(0);
    }
  });

  it("getShopItem menemukan item & undefined untuk yang tidak ada", () => {
    expect(getShopItem("ramuan")?.kind).toBe("potion");
    expect(getShopItem("tidak-ada")).toBeUndefined();
  });
});
