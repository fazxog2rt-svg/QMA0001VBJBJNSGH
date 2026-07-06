import type { BotClient } from "../../client";
import { GuildConfig } from "../../database/models/GuildConfig";
import { buildEmbed } from "../../utils/embed";
import { logger } from "../logger.service";
import { requestAiCompletion } from "../ai/openRouterClient";
import {
  MOTIVATION_CATEGORIES,
  isMotivationCategory,
  type MotivationCategory,
} from "../../config/motivation";

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Hasilkan teks motivasi untuk kategori (AI bila tersedia, jika gagal pakai bank kutipan). */
export async function generateMotivation(category: MotivationCategory): Promise<string> {
  const cfg = MOTIVATION_CATEGORIES[category];

  const ai = await requestAiCompletion(
    cfg.prompt,
    "Tuliskan satu pesan motivasi baru yang segar dan berbeda dari biasanya.",
  );
  if (ai.ok && ai.content) return ai.content.trim();

  return pickRandom(cfg.fallback);
}

/** Kirim satu motivasi ke channel yang dikonfigurasi guild. */
export async function postMotivation(
  client: BotClient,
  guildId: string,
  category: MotivationCategory,
  channelId: string,
): Promise<boolean> {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased() || !("send" in channel)) return false;

  const text = await generateMotivation(category);
  const cfg = MOTIVATION_CATEGORIES[category];

  await channel.send({
    embeds: [buildEmbed("primary").setTitle(`${cfg.emoji} Motivasi`).setDescription(text)],
  });
  return true;
}

/**
 * Dipanggil tiap menit oleh scheduler. Untuk tiap guild yang mengaktifkan motivasi,
 * kirim setiap `intervalHours` jam (mis. 1 jam sekali) berdasarkan waktu terakhir kirim.
 */
export async function runScheduledMotivations(client: BotClient): Promise<void> {
  const now = Date.now();

  const configs = await GuildConfig.find({
    "motivation.enabled": true,
    "motivation.channelId": { $ne: null },
  });

  for (const config of configs) {
    const m = config.motivation;
    if (!m?.channelId) continue;

    const intervalMs = Math.max(1, m.intervalHours ?? 24) * 3_600_000;
    const last = m.lastPostedAt ? m.lastPostedAt.getTime() : 0;
    if (now - last < intervalMs) continue;

    const categories = (m.categories ?? ["kehidupan"]).filter(isMotivationCategory);
    const category = (
      categories.length > 0 ? pickRandom(categories) : "kehidupan"
    ) as MotivationCategory;

    try {
      const sent = await postMotivation(client, config.guildId, category, m.channelId);
      if (sent) {
        config.motivation!.lastPostedAt = new Date();
        await config.save();
      }
    } catch (error) {
      logger.warn("Gagal mengirim motivasi terjadwal", {
        guildId: config.guildId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}
