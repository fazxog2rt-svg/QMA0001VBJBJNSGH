import { type HydratedDocument } from "mongoose";
import { Pet, type PetDocument } from "../../database/models/Pet";
import { adjustWallet } from "../economy/economyService";

export const PET_SPECIES = [
  { name: "🐱 Kucing", value: "🐱 Kucing" },
  { name: "🐶 Anjing", value: "🐶 Anjing" },
  { name: "🐉 Naga", value: "🐉 Naga" },
  { name: "🐰 Kelinci", value: "🐰 Kelinci" },
  { name: "🦊 Rubah", value: "🦊 Rubah" },
  { name: "🐼 Panda", value: "🐼 Panda" },
  { name: "🐧 Penguin", value: "🐧 Penguin" },
  { name: "🦁 Singa", value: "🦁 Singa" },
] as const;

const FEED_COST = 50;
const FEED_HUNGER_GAIN = 40;
const PLAY_COOLDOWN_MS = 30 * 60 * 1000;
const PLAY_HAPPINESS_GAIN = 30;
const PLAY_XP_GAIN = 15;

export function xpForNextLevel(level: number): number {
  return level * 100;
}

/** Terapkan penurunan hunger & happiness berdasarkan waktu (lapar & bosan seiring waktu). */
function applyDecay(pet: HydratedDocument<PetDocument>): void {
  const now = Date.now();
  const hours = Math.floor((now - pet.lastDecayAt.getTime()) / 3_600_000);
  if (hours >= 1) {
    pet.hunger = Math.max(0, pet.hunger - hours * 4);
    pet.happiness = Math.max(0, pet.happiness - hours * 3);
    pet.lastDecayAt = new Date();
  }
}

export async function getPet(
  guildId: string,
  userId: string,
): Promise<HydratedDocument<PetDocument> | null> {
  const pet = await Pet.findOne({ guildId, userId });
  if (!pet) return null;
  applyDecay(pet);
  await pet.save();
  return pet;
}

export async function adoptPet(
  guildId: string,
  userId: string,
  name: string,
  species: string,
): Promise<{ ok: boolean; error?: string; pet?: HydratedDocument<PetDocument> }> {
  const existing = await Pet.findOne({ guildId, userId });
  if (existing) return { ok: false, error: "Kamu sudah punya pet. Rawat yang ada dulu ya!" };

  const pet = await Pet.create({ guildId, userId, name, species });
  return { ok: true, pet };
}

export interface PetActionResult {
  ok: boolean;
  error?: string;
  pet?: HydratedDocument<PetDocument>;
  leveledUp?: boolean;
}

export async function feedPet(guildId: string, userId: string): Promise<PetActionResult> {
  const pet = await getPet(guildId, userId);
  if (!pet) return { ok: false, error: "Kamu belum punya pet. Adopsi dulu dengan `/pet adopsi`." };
  if (pet.hunger >= 100) return { ok: false, error: `${pet.name} masih kenyang banget. 🍖` };

  const debit = await adjustWallet(guildId, userId, -FEED_COST);
  if (!debit.success) {
    return {
      ok: false,
      error: `Butuh 🪙 ${FEED_COST} untuk membeli makanan, tapi saldomu kurang.`,
    };
  }

  pet.hunger = Math.min(100, pet.hunger + FEED_HUNGER_GAIN);
  pet.lastFedAt = new Date();
  await pet.save();
  return { ok: true, pet };
}

export async function playWithPet(guildId: string, userId: string): Promise<PetActionResult> {
  const pet = await getPet(guildId, userId);
  if (!pet) return { ok: false, error: "Kamu belum punya pet. Adopsi dulu dengan `/pet adopsi`." };

  const now = Date.now();
  if (pet.lastPlayedAt && now - pet.lastPlayedAt.getTime() < PLAY_COOLDOWN_MS) {
    const mins = Math.ceil((PLAY_COOLDOWN_MS - (now - pet.lastPlayedAt.getTime())) / 60_000);
    return { ok: false, error: `${pet.name} masih capek main. Coba lagi dalam ${mins} menit.` };
  }
  if (pet.hunger <= 0) {
    return { ok: false, error: `${pet.name} terlalu lapar untuk main. Kasih makan dulu! 🍖` };
  }

  pet.happiness = Math.min(100, pet.happiness + PLAY_HAPPINESS_GAIN);
  pet.lastPlayedAt = new Date();

  let leveledUp = false;
  pet.xp += PLAY_XP_GAIN;
  while (pet.xp >= xpForNextLevel(pet.level)) {
    pet.xp -= xpForNextLevel(pet.level);
    pet.level += 1;
    leveledUp = true;
  }

  await pet.save();
  return { ok: true, pet, leveledUp };
}

export async function renamePet(
  guildId: string,
  userId: string,
  name: string,
): Promise<PetActionResult> {
  const pet = await Pet.findOne({ guildId, userId });
  if (!pet) return { ok: false, error: "Kamu belum punya pet." };
  pet.name = name;
  await pet.save();
  return { ok: true, pet };
}
