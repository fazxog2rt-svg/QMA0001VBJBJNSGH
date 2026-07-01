import OpenAI from "openai";
import { env } from "../../config/env";

let client: OpenAI | null = null;

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
    const response = await getClient().chat.completions.create({
      model: env.OPENROUTER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1000,
    });

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
