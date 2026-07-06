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
    embeds: [buildEmbed("primary").setTitle(`${cfg.emoji} Motivasi Hari Ini`).setDescription(text)],
  });
  return true;
}

// Menit target harian yang "acak tapi tetap" per guild+tanggal, biar tidak selalu
// tepat menit 0 (terasa lebih alami, bukan bot yang kaku).
function targetMinute(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  return h % 50;
}

function jakartaNow(): { dateStr: string; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return {
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

/**
 * Dipanggil tiap menit oleh scheduler. Untuk tiap guild yang mengaktifkan motivasi,
 * kirim sekali sehari saat jam yang ditentukan (dengan offset menit acak).
 */
export async function runDailyMotivations(client: BotClient): Promise<void> {
  const { dateStr, hour, minute } = jakartaNow();

  const configs = await GuildConfig.find({
    "motivation.enabled": true,
    "motivation.channelId": { $ne: null },
  });

  for (const config of configs) {
    const m = config.motivation;
    if (!m?.channelId) continue;
    if (m.lastPostedDate === dateStr) continue; // sudah hari ini
    if (hour !== (m.hour ?? 7)) continue;
    if (minute < targetMinute(`${dateStr}:${config.guildId}`)) continue;

    const categories = (m.categories ?? ["kehidupan"]).filter(isMotivationCategory);
    const category = (
      categories.length > 0 ? pickRandom(categories) : "kehidupan"
    ) as MotivationCategory;

    try {
      const sent = await postMotivation(client, config.guildId, category, m.channelId);
      if (sent) {
        config.motivation!.lastPostedDate = dateStr;
        await config.save();
      }
    } catch (error) {
      logger.warn("Gagal mengirim motivasi harian", {
        guildId: config.guildId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}
