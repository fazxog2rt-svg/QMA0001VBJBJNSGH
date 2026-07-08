import type { HydratedDocument } from "mongoose";
import { RpgCharacter, type RpgCharacterDocument } from "../../database/models/RpgCharacter";
import { RPG_CLASSES, getShopItem, rpgXpForLevel } from "../../config/rpg";

export interface RpgResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

export type RpgChar = HydratedDocument<RpgCharacterDocument>;

export function getCharacter(guildId: string, userId: string) {
  return RpgCharacter.findOne({ guildId, userId });
}

export function effectiveAttack(char: RpgChar): number {
  return char.attack + (char.weaponAtk ?? 0);
}

export function effectiveDefense(char: RpgChar): number {
  return char.defense + (char.armorDef ?? 0);
}

export async function createCharacter(
  guildId: string,
  userId: string,
  classKey: string,
): Promise<RpgResult<RpgChar>> {
  const cls = RPG_CLASSES[classKey];
  if (!cls) return { ok: false, error: "Kelas tidak dikenal." };

  const existing = await getCharacter(guildId, userId);
  if (existing) return { ok: false, error: "Kamu sudah punya karakter RPG." };

  const char = await RpgCharacter.create({
    guildId,
    userId,
    className: cls.key,
    maxHp: cls.maxHp,
    hp: cls.maxHp,
    attack: cls.attack,
    defense: cls.defense,
    gold: 50,
    potions: 1,
  });
  return { ok: true, data: char };
}

export interface LevelUpInfo {
  leveledUp: boolean;
  newLevel: number;
  gainedLevels: number;
}

/** Tambah XP & naik level (statistik bertambah, HP penuh saat naik). */
export function applyXp(char: RpgChar, xp: number): LevelUpInfo {
  char.xp += xp;
  let gained = 0;
  while (char.xp >= rpgXpForLevel(char.level)) {
    char.xp -= rpgXpForLevel(char.level);
    char.level += 1;
    char.maxHp += 12;
    char.attack += 3;
    char.defense += 2;
    char.hp = char.maxHp; // pulih penuh saat naik level
    gained += 1;
  }
  return { leveledUp: gained > 0, newLevel: char.level, gainedLevels: gained };
}

/** Beli item toko dengan gold. Potion menambah stok; senjata/zirah auto-equip bila lebih baik. */
export async function buyShopItem(
  guildId: string,
  userId: string,
  itemKey: string,
): Promise<RpgResult<{ label: string; equipped: boolean }>> {
  const item = getShopItem(itemKey);
  if (!item) return { ok: false, error: "Item tidak ada di toko." };

  const char = await getCharacter(guildId, userId);
  if (!char) return { ok: false, error: "Kamu belum punya karakter. Buat dengan `/rpg mulai`." };
  if (char.gold < item.price)
    return { ok: false, error: `Gold tidak cukup (butuh ${item.price}).` };

  char.gold -= item.price;
  let equipped = false;

  if (item.kind === "potion") {
    char.potions += 1;
  } else if (item.kind === "weapon") {
    if (item.bonus > (char.weaponAtk ?? 0)) {
      char.weaponName = item.label;
      char.weaponAtk = item.bonus;
      equipped = true;
    }
  } else {
    if (item.bonus > (char.armorDef ?? 0)) {
      char.armorName = item.label;
      char.armorDef = item.bonus;
      equipped = true;
    }
  }

  await char.save();
  return { ok: true, data: { label: item.label, equipped } };
}
