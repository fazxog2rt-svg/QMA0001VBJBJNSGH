import path from "node:path";
import { config } from "dotenv";
import { z } from "zod";

// Muat .env dari root proyek (dua tingkat di atas dist/config atau src/config),
// bukan dari current working directory — supaya tetap ketemu di panel hosting
// yang menjalankan bot dari direktori kerja berbeda. Fallback ke cwd juga dicoba.
config({ path: path.resolve(__dirname, "../../.env") });
config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).default("info"),

  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN wajib diisi"),
  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID wajib diisi"),
  DISCORD_DEV_GUILD_ID: z.string().optional(),
  // Jika "true", bot akan otomatis mendaftarkan (deploy) semua slash/context-menu
  // command ke Discord saat startup. Berguna untuk panel hosting yang tidak
  // memberi akses terminal untuk menjalankan `npm run deploy-commands`.
  AUTO_DEPLOY_COMMANDS: z
    .string()
    .optional()
    .transform((value) => value === "true" || value === "1"),
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

  // Dashboard web (opsional). Aktifkan dengan DASHBOARD_ENABLED=true.
  DASHBOARD_ENABLED: z
    .string()
    .optional()
    .transform((value) => value === "true" || value === "1"),
  // Secret OAuth2 aplikasi Discord (Developer Portal → OAuth2). Wajib jika dashboard aktif.
  DISCORD_CLIENT_SECRET: z.string().optional(),
  // URL publik dashboard, mis. https://nexterastore.web.id (untuk redirect OAuth).
  DASHBOARD_BASE_URL: z.string().optional(),
  // Port dashboard. Default: SERVER_PORT (dari panel) atau 3000.
  DASHBOARD_PORT: z.string().optional(),
  // Kunci penandatangan sesi login. Set nilai acak & rahasia bila dashboard aktif.
  SESSION_SECRET: z.string().optional(),
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
