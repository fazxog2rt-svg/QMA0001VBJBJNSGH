import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).default("info"),

  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN wajib diisi"),
  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID wajib diisi"),
  DISCORD_DEV_GUILD_ID: z.string().optional(),
  OWNER_IDS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),

  MONGODB_URI: z.string().min(1, "MONGODB_URI wajib diisi"),
  REDIS_URL: z.string().min(1, "REDIS_URL wajib diisi"),

  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
  OPENROUTER_MODEL: z.string().default("openai/gpt-4o-mini"),
  OPENROUTER_SITE_URL: z.string().optional(),
  OPENROUTER_APP_NAME: z.string().default("KomunitasBot"),

  KTP_ISSUER_NAME: z.string().default("Dukcapil Komunitas"),
  KTP_CARD_STORAGE_PATH: z.string().default("./storage/identity-cards"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Konfigurasi environment tidak valid:\n${issues}`);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
