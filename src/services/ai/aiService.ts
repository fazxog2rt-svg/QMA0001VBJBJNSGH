import { GuildConfig } from "../../database/models/GuildConfig";
import { AiChatLog } from "../../database/models/AiChatLog";
import { getOrCreateMember } from "../profile/profileService";
import { requestAiCompletion, type AiCompletionResult } from "./openRouterClient";

export async function isAiEnabledForGuild(guildId: string): Promise<boolean> {
  const guildConfig = await GuildConfig.findOne({ guildId });
  return guildConfig?.aiAssistantEnabled ?? false;
}

async function trackAiUsage(
  guildId: string,
  userId: string,
  feature: string,
  prompt: string,
  response: string,
): Promise<void> {
  const member = await getOrCreateMember(guildId, userId);
  member.aiUsageCount += 1;
  await member.save();

  await AiChatLog.create({
    guildId,
    userId,
    feature,
    prompt: prompt.slice(0, 2000),
    response: response.slice(0, 4000),
  });
}

export interface AiFeatureResult extends AiCompletionResult {
  usageTracked?: boolean;
}

async function runAiFeature(
  guildId: string,
  userId: string,
  feature: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<AiFeatureResult> {
  const result = await requestAiCompletion(systemPrompt, userPrompt);
  if (result.ok && result.content) {
    await trackAiUsage(guildId, userId, feature, userPrompt, result.content);
  }
  return result;
}

export function aiChat(guildId: string, userId: string, message: string): Promise<AiFeatureResult> {
  return runAiFeature(
    guildId,
    userId,
    "chat",
    "Kamu adalah asisten AI ramah untuk komunitas Discord Indonesia. Jawab singkat, jelas, dan sopan dalam Bahasa Indonesia kecuali diminta bahasa lain.",
    message,
  );
}

export function aiTranslate(
  guildId: string,
  userId: string,
  text: string,
  targetLanguage: string,
): Promise<AiFeatureResult> {
  return runAiFeature(
    guildId,
    userId,
    "translation",
    `Terjemahkan teks yang diberikan pengguna ke dalam bahasa "${targetLanguage}". Hanya kembalikan hasil terjemahan tanpa penjelasan tambahan.`,
    text,
  );
}

export function aiSummarize(
  guildId: string,
  userId: string,
  conversation: string,
): Promise<AiFeatureResult> {
  return runAiFeature(
    guildId,
    userId,
    "summarizer",
    "Ringkas percakapan Discord berikut menjadi poin-poin singkat dalam Bahasa Indonesia. Fokus pada topik utama dan keputusan penting.",
    conversation,
  );
}

export function aiExplainCode(
  guildId: string,
  userId: string,
  code: string,
): Promise<AiFeatureResult> {
  return runAiFeature(
    guildId,
    userId,
    "coding_assistant",
    "Kamu adalah asisten programming. Jelaskan apa yang dilakukan kode berikut secara ringkas dan jelas dalam Bahasa Indonesia, baris per baris jika perlu.",
    code,
  );
}

export function aiCodingHelp(
  guildId: string,
  userId: string,
  question: string,
): Promise<AiFeatureResult> {
  return runAiFeature(
    guildId,
    userId,
    "coding_assistant",
    "Kamu adalah asisten programming ahli. Bantu jawab pertanyaan coding pengguna dengan contoh kode singkat jika relevan. Jawab dalam Bahasa Indonesia.",
    question,
  );
}

export function aiGrammarCheck(
  guildId: string,
  userId: string,
  text: string,
): Promise<AiFeatureResult> {
  return runAiFeature(
    guildId,
    userId,
    "grammar_checker",
    "Periksa ejaan dan tata bahasa teks berikut. Berikan versi yang sudah diperbaiki, lalu daftar singkat perubahan yang dilakukan. Gunakan Bahasa Indonesia.",
    text,
  );
}

export function aiGeneratePrompt(
  guildId: string,
  userId: string,
  topic: string,
): Promise<AiFeatureResult> {
  return runAiFeature(
    guildId,
    userId,
    "prompt_generator",
    "Buatkan sebuah prompt AI yang detail dan efektif berdasarkan topik/tujuan yang diberikan pengguna. Kembalikan hanya prompt-nya.",
    topic,
  );
}

export function aiModerationAssessment(
  guildId: string,
  userId: string,
  content: string,
): Promise<AiFeatureResult> {
  return runAiFeature(
    guildId,
    userId,
    "moderation",
    "Kamu adalah asisten moderasi. Analisis pesan berikut untuk konten toksik, spam, atau scam. Jawab dengan format:\nRisiko: <Rendah/Sedang/Tinggi>\nKategori: <penjelasan singkat>\nSaran Tindakan: <saran untuk moderator, JANGAN mengambil tindakan apapun sendiri>",
    content,
  );
}

export function aiFaqAnswer(
  guildId: string,
  userId: string,
  question: string,
  faqContext: string,
): Promise<AiFeatureResult> {
  return runAiFeature(
    guildId,
    userId,
    "faq",
    `Kamu adalah asisten FAQ komunitas. Jawab pertanyaan berdasarkan daftar FAQ berikut jika relevan:\n${faqContext}\n\nJika pertanyaan tidak berkaitan dengan FAQ di atas, jawab dengan pengetahuan umum secara singkat.`,
    question,
  );
}
