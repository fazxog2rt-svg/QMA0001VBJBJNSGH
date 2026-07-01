import Anthropic from "@anthropic-ai/sdk";
import { env } from "../../config/env";
import { childLogger } from "../logger";

const log = childLogger("ai-provider");

export interface AiCompleteOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AiCompleteResult {
  text: string;
  tokensUsed: number;
}

export interface AiProvider {
  readonly isConfigured: boolean;
  complete(prompt: string, opts?: AiCompleteOptions): Promise<AiCompleteResult>;
}

const ANTHROPIC_MODEL = "claude-sonnet-5";
const NOT_CONFIGURED_MESSAGE =
  "The AI assistant is not configured for this bot yet. Ask an administrator to set ANTHROPIC_API_KEY.";

class AnthropicProvider implements AiProvider {
  private readonly client: Anthropic | null;

  constructor(apiKey: string | undefined) {
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async complete(prompt: string, opts: AiCompleteOptions = {}): Promise<AiCompleteResult> {
    if (!this.client) {
      return { text: NOT_CONFIGURED_MESSAGE, tokensUsed: 0 };
    }

    try {
      const response = await this.client.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.7,
        system: opts.system,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

      const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

      return { text: text || "(empty response)", tokensUsed };
    } catch (err) {
      log.error({ err }, "Anthropic completion failed");
      return {
        text: "Sorry, I couldn't reach the AI service right now. Please try again shortly.",
        tokensUsed: 0,
      };
    }
  }
}

export const aiProvider: AiProvider = new AnthropicProvider(env.ANTHROPIC_API_KEY);
