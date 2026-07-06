import type { Message } from "discord.js";
import { AutoResponder } from "../../database/models/AutoResponder";

// Cache sederhana per guild agar tidak query DB tiap pesan. TTL pendek.
const cache = new Map<string, { at: number; items: AutoResponderItem[] }>();
const CACHE_TTL_MS = 30_000;

interface AutoResponderItem {
  trigger: string;
  response: string;
  matchType: "exact" | "contains" | "startsWith";
  enabled: boolean;
}

async function getResponders(guildId: string): Promise<AutoResponderItem[]> {
  const cached = cache.get(guildId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.items;

  const items = (await AutoResponder.find({
    guildId,
    enabled: true,
  }).lean()) as AutoResponderItem[];
  cache.set(guildId, { at: Date.now(), items });
  return items;
}

export function invalidateAutoResponderCache(guildId: string): void {
  cache.delete(guildId);
}

/** Balas otomatis bila pesan cocok dengan salah satu trigger. Return true bila membalas. */
export async function handleAutoResponder(message: Message<true>): Promise<boolean> {
  const content = message.content.trim().toLowerCase();
  if (!content) return false;

  const responders = await getResponders(message.guildId);
  if (responders.length === 0) return false;

  for (const item of responders) {
    const trigger = item.trigger.toLowerCase();
    const matched =
      item.matchType === "exact"
        ? content === trigger
        : item.matchType === "startsWith"
          ? content.startsWith(trigger)
          : content.includes(trigger);

    if (matched) {
      await message
        .reply({ content: item.response, allowedMentions: { repliedUser: false } })
        .catch(() => undefined);
      return true;
    }
  }
  return false;
}
