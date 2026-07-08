/** Konfigurasi RPG: kelas, monster, dan toko. */

export interface RpgClass {
  key: string;
  label: string;
  emoji: string;
  maxHp: number;
  attack: number;
  defense: number;
  description: string;
}

export const RPG_CLASSES: Record<string, RpgClass> = {
  ksatria: {
    key: "ksatria",
    label: "Ksatria",
    emoji: "🛡️",
    maxHp: 120,
    attack: 12,
    defense: 8,
    description: "Tebal & tahan pukul. Cocok untuk pemula.",
  },
  penyihir: {
    key: "penyihir",
    label: "Penyihir",
    emoji: "🔮",
    maxHp: 80,
    attack: 20,
    defense: 3,
    description: "Serangan besar, tapi rapuh.",
  },
  pemanah: {
    key: "pemanah",
    label: "Pemanah",
    emoji: "🏹",
    maxHp: 95,
    attack: 16,
    defense: 5,
    description: "Seimbang antara serangan & pertahanan.",
  },
};

export function isRpgClass(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(RPG_CLASSES, key);
}

export interface Monster {
  name: string;
  emoji: string;
  minLevel: number;
  hp: number;
  attack: number;
  xpReward: number;
  goldReward: number;
}

// Diurut menaik berdasar minLevel; pemilihan memakai monster yang sesuai level.
export const MONSTERS: Monster[] = [
  { name: "Tikus Got", emoji: "🐀", minLevel: 1, hp: 30, attack: 6, xpReward: 20, goldReward: 15 },
  { name: "Kelelawar", emoji: "🦇", minLevel: 1, hp: 40, attack: 8, xpReward: 28, goldReward: 20 },
  { name: "Serigala", emoji: "🐺", minLevel: 3, hp: 70, attack: 12, xpReward: 45, goldReward: 35 },
  { name: "Goblin", emoji: "👺", minLevel: 5, hp: 100, attack: 16, xpReward: 70, goldReward: 55 },
  {
    name: "Golem Batu",
    emoji: "🗿",
    minLevel: 8,
    hp: 160,
    attack: 22,
    xpReward: 120,
    goldReward: 90,
  },
  {
    name: "Naga Muda",
    emoji: "🐉",
    minLevel: 12,
    hp: 240,
    attack: 30,
    xpReward: 200,
    goldReward: 160,
  },
];

export interface RpgShopItem {
  key: string;
  label: string;
  emoji: string;
  price: number;
  kind: "potion" | "weapon" | "armor";
  bonus: number; // potion: %heal; weapon: +attack; armor: +defense
}

export const RPG_SHOP: RpgShopItem[] = [
  { key: "ramuan", label: "Ramuan Kecil", emoji: "🧪", price: 40, kind: "potion", bonus: 50 },
  { key: "pedang-besi", label: "Pedang Besi", emoji: "⚔️", price: 250, kind: "weapon", bonus: 6 },
  { key: "pedang-baja", label: "Pedang Baja", emoji: "🗡️", price: 700, kind: "weapon", bonus: 14 },
  { key: "perisai-kayu", label: "Perisai Kayu", emoji: "🛡️", price: 200, kind: "armor", bonus: 5 },
  { key: "zirah-baja", label: "Zirah Baja", emoji: "🥋", price: 650, kind: "armor", bonus: 12 },
];

export function getShopItem(key: string): RpgShopItem | undefined {
  return RPG_SHOP.find((item) => item.key === key);
}

/** XP yang dibutuhkan untuk naik dari `level` ke level berikutnya. */
export function rpgXpForLevel(level: number): number {
  return 100 + (level - 1) * 60;
}

/** Pilih monster acak yang cocok untuk level karakter. */
export function pickMonster(level: number): Monster {
  const eligible = MONSTERS.filter((m) => m.minLevel <= level);
  const pool = eligible.length > 0 ? eligible : [MONSTERS[0]!];
  return pool[Math.floor(Math.random() * pool.length)]!;
}
