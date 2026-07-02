import { BotClient } from "./client";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./database/connection";
import { loadCommands } from "./handlers/commandHandler";
import { loadComponents } from "./handlers/componentHandler";
import { loadContextMenuCommands } from "./handlers/contextMenuHandler";
import { loadEvents } from "./handlers/eventHandler";
import { registerCommands } from "./handlers/registerCommands";
import { connectRedis, disconnectRedis } from "./services/redis.service";
import { logger } from "./services/logger.service";
import { startScheduler } from "./services/scheduler/cronJobs";
import { initLocales } from "./utils/locale";

async function bootstrap(): Promise<void> {
  await initLocales();
  await connectDatabase();

  // Redis adalah optimasi (cache + sesi KTP), bukan dependensi kritis. Jika gagal
  // konek — misalnya REDIS_URL salah/tanpa TLS — bot tetap jalan dengan cache mati
  // dan fallback aman ke database, alih-alih crash total saat startup.
  try {
    await connectRedis();
  } catch (error) {
    logger.warn(
      "Redis gagal terkoneksi — bot lanjut tanpa cache. Untuk Upstash pastikan REDIS_URL memakai skema TLS 'rediss://'.",
      { error: error instanceof Error ? error.message : error },
    );
  }

  const client = new BotClient();

  await loadEvents(client);
  await loadCommands(client);
  await loadContextMenuCommands(client);
  await loadComponents(client);

  await client.login(env.DISCORD_TOKEN);

  // Panel hosting tanpa akses terminal bisa mendaftarkan slash command dengan
  // menyetel AUTO_DEPLOY_COMMANDS=true. Gagal deploy tidak mematikan bot.
  if (env.AUTO_DEPLOY_COMMANDS) {
    try {
      await registerCommands();
    } catch (error) {
      logger.error("Auto-deploy command gagal", {
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  startScheduler(client);

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Menerima ${signal}, mematikan bot dengan aman...`);
    client.destroy();
    await disconnectRedis();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

bootstrap().catch((error) => {
  logger.error("Gagal menjalankan bot", { error: error instanceof Error ? error.message : error });
  process.exit(1);
});
