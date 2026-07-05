import OpenAI from "openai";
import Bottleneck from "bottleneck";
import { env } from "../../config/env";

let client: OpenAI | null = null;

// Throttle outbound AI calls: max 1 concurrent, min 1s between requests, so a
// burst of /ai-chat usage can't blow through OpenRouter rate limits or budget.
const limiter = new Bottleneck({ maxConcurrent: 1, minTime: 1000 });

export function isAiConfigured(): boolean {
  return Boolean(env.OPENROUTER_API_KEY);
}

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: env.OPENROUTER_BASE_URL,
      defaultHeaders: {
        "HTTP-Referer": env.OPENROUTER_SITE_URL ?? "",
        "X-Title": env.OPENROUTER_APP_NAME,
      },
    });
  }
  return client;
}

export interface AiCompletionResult {
  ok: boolean;
  content?: string;
  error?: string;
}

export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Versi chat multi-pesan (mendukung riwayat percakapan) dengan pilihan model
 * opsional. Dipakai AI Auto-Reply Channel agar tiap channel bisa punya model &
 * persona sendiri. Tetap lewat limiter yang sama untuk melindungi kuota.
 */
export async function requestAiChatCompletion(
  messages: AiChatMessage[],
  options: { model?: string; maxTokens?: number } = {},
): Promise<AiCompletionResult> {
  if (!isAiConfigured()) {
    return {
      ok: false,
      error: "Fitur AI belum dikonfigurasi. Admin bot perlu mengatur OPENROUTER_API_KEY.",
    };
  }

  try {
    const response = await limiter.schedule(() =>
      getClient().chat.completions.create({
        model: options.model ?? env.OPENROUTER_MODEL,
        messages,
        max_tokens: options.maxTokens ?? 500,
      }),
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { ok: false, error: "AI tidak memberikan respons. Coba lagi." };
    }
    return { ok: true, content };
  } catch (error) {
    return {
      ok: false,
      error: `Gagal menghubungi layanan AI: ${error instanceof Error ? error.message : "kesalahan tidak diketahui"}.`,
    };
  }
}

export async function requestAiCompletion(
  systemPrompt: string,
  userPrompt: string,
): Promise<AiCompletionResult> {
  if (!isAiConfigured()) {
    return {
      ok: false,
      error: "Fitur AI belum dikonfigurasi. Admin bot perlu mengatur OPENROUTER_API_KEY.",
    };
  }

  try {
    const response = await limiter.schedule(() =>
      getClient().chat.completions.create({
        model: env.OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1000,
      }),
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { ok: false, error: "AI tidak memberikan respons. Coba lagi." };
    }

    return { ok: true, content };
  } catch (error) {
    return {
      ok: false,
      error: `Gagal menghubungi layanan AI: ${error instanceof Error ? error.message : "kesalahan tidak diketahui"}.`,
    };
  }
}
