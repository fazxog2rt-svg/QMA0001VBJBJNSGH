import { ChannelType, type Message } from "discord.js";
import { GuildConfig } from "../../database/models/GuildConfig";
import { AiChatLog } from "../../database/models/AiChatLog";
import { getOrCreateMember } from "../profile/profileService";
import { logger } from "../logger.service";
import { AI_PERSONAS, isAiPersonaKey, type AiPersonaKey } from "./aiPersonas";
import { requestAiChatCompletion, type AiChatMessage } from "./openRouterClient";

export interface AiChannelConfig {
  channelId: string;
  persona: string;
  model: string;
  customInstruction: string;
  enabled: boolean;
}

/** Tambah / perbarui konfigurasi AI untuk sebuah channel. */
export async function upsertAiChannel(
  guildId: string,
  channelId: string,
  persona: AiPersonaKey,
  model: string,
  customInstruction: string,
): Promise<void> {
  // Hapus entri lama untuk channel ini (jika ada), lalu tambahkan yang baru —
  // menjaga satu konfigurasi per channel.
  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $pull: { aiChannels: { channelId } } },
    { upsert: true },
  );
  await GuildConfig.findOneAndUpdate(
    { guildId },
    { $push: { aiChannels: { channelId, persona, model, customInstruction, enabled: true } } },
    { upsert: true },
  );
}

export async function removeAiChannel(guildId: string, channelId: string): Promise<boolean> {
  const result = await GuildConfig.findOneAndUpdate(
    { guildId },
    { $pull: { aiChannels: { channelId } } },
  );
  return Boolean(result?.aiChannels?.some((c) => c.channelId === channelId));
}

export async function listAiChannels(guildId: string): Promise<AiChannelConfig[]> {
  const config = await GuildConfig.findOne({ guildId });
  return (config?.aiChannels ?? []) as AiChannelConfig[];
}

async function getAiChannel(
  guildId: string,
  channelId: string,
): Promise<AiChannelConfig | undefined> {
  const config = await GuildConfig.findOne({ guildId });
  return (config?.aiChannels as AiChannelConfig[] | undefined)?.find(
    (c) => c.channelId === channelId && c.enabled,
  );
}

const MAX_HISTORY = 6;

/**
 * Bangun prompt sistem dari persona + instruksi kustom admin.
 */
function buildSystemPrompt(personaKey: string, customInstruction: string): string {
  const persona = isAiPersonaKey(personaKey) ? AI_PERSONAS[personaKey] : AI_PERSONAS.ramah;
  const base = persona.systemPrompt;
  const extra = customInstruction.trim()
    ? `\n\nInstruksi tambahan dari admin server: ${customInstruction.trim()}`
    : "";
  return (
    `${base}${extra}\n\nKamu sedang membalas obrolan di channel Discord. ` +
    "Balas seperti percakapan chat biasa (ringkas, maksimal beberapa kalimat). " +
    "Jangan mengulang pertanyaan pengguna. Jangan pura-pura jadi manusia."
  );
}

/**
 * Jika pesan berada di channel AI yang aktif, hasilkan & kirim balasan otomatis.
 * Mengembalikan true jika pesan ditangani sebagai channel AI.
 */
export async function handleAiChannelMessage(message: Message<true>): Promise<boolean> {
  const channelConfig = await getAiChannel(message.guildId, message.channelId);
  if (!channelConfig) return false;

  // Abaikan pesan kosong (mis. hanya lampiran/stiker) atau yang diawali prefix
  // command umum agar tidak bentrok dengan bot lain.
  const content = message.content.trim();
  if (!content || /^[!./$%^&*+=~-]/.test(content)) return false;

  if (message.channel.type !== ChannelType.GuildText) return false;

  await message.channel.sendTyping().catch(() => undefined);

  // Kumpulkan sedikit riwayat channel supaya balasan terasa nyambung.
  const history = await message.channel.messages
    .fetch({ limit: MAX_HISTORY, before: message.id })
    .catch(() => null);

  const historyMessages: AiChatMessage[] = [];
  if (history) {
    const ordered = [...history.values()].reverse();
    for (const past of ordered) {
      const text = past.content.trim();
      if (!text) continue;
      if (past.author.id === message.client.user.id) {
        historyMessages.push({ role: "assistant", content: text.slice(0, 500) });
      } else if (!past.author.bot) {
        historyMessages.push({
          role: "user",
          content: `${past.author.username}: ${text.slice(0, 500)}`,
        });
      }
    }
  }

  const messages: AiChatMessage[] = [
    {
      role: "system",
      content: buildSystemPrompt(channelConfig.persona, channelConfig.customInstruction),
    },
    ...historyMessages,
    { role: "user", content: `${message.author.username}: ${content.slice(0, 1000)}` },
  ];

  const result = await requestAiChatCompletion(messages, { model: channelConfig.model });

  if (!result.ok || !result.content) {
    await message
      .reply({ content: `⚠️ ${result.error ?? "AI gagal membalas."}` })
      .catch(() => undefined);
    return true;
  }

  await message.reply({ content: result.content.slice(0, 2000) }).catch(() => undefined);

  // Catat penggunaan (best-effort; jangan sampai menggagalkan balasan).
  try {
    const member = await getOrCreateMember(message.guildId, message.author.id);
    member.aiUsageCount += 1;
    await member.save();
    await AiChatLog.create({
      guildId: message.guildId,
      userId: message.author.id,
      feature: "channel_autoreply",
      prompt: content.slice(0, 2000),
      response: result.content.slice(0, 4000),
    });
  } catch (error) {
    logger.warn("Gagal mencatat penggunaan AI channel", {
      error: error instanceof Error ? error.message : error,
    });
  }

  return true;
}
