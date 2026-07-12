import { GuildConfig } from "../../database/models/GuildConfig";
import { cached, invalidateCache } from "../cache.service";

/** Kategori command yang bisa dimatikan lewat dashboard. Sisanya selalu aktif. */
export const TOGGLEABLE_CATEGORIES = [
  "economy",
  "fun",
  "leveling",
  "community",
  "ai",
  "events",
] as const;

export type ToggleableCategory = (typeof TOGGLEABLE_CATEGORIES)[number];

function isToggleable(category: string): category is ToggleableCategory {
  return (TOGGLEABLE_CATEGORIES as readonly string[]).includes(category);
}

function cacheKey(guildId: string): string {
  return `features:${guildId}`;
}

/** Ambil peta sakelar fitur guild (cache 30 dtk). */
async function getFeatureMap(guildId: string): Promise<Record<string, boolean>> {
  return cached(cacheKey(guildId), 30, async () => {
    const config = await GuildConfig.findOne({ guildId }).select("features").lean();
    return (config?.features ?? {}) as Record<string, boolean>;
  });
}

/** Apakah kategori command aktif untuk guild ini? Kategori non-toggle selalu true. */
export async function isCategoryEnabled(guildId: string, category: string): Promise<boolean> {
  if (!isToggleable(category)) return true;
  const features = await getFeatureMap(guildId);
  return features[category] !== false;
}

/** Buang cache sakelar fitur (dipanggil dashboard setelah menyimpan). */
export function invalidateFeatureCache(guildId: string): Promise<void> {
  return invalidateCache(cacheKey(guildId));
}
