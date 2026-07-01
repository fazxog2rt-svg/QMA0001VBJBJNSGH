import { BotClient } from "./client";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./database/connection";
import { loadCommands } from "./handlers/commandHandler";
import { loadComponents } from "./handlers/componentHandler";
import { loadEvents } from "./handlers/eventHandler";
import { connectRedis, disconnectRedis } from "./services/redis.service";
import { logger } from "./services/logger.service";
import { startScheduler } from "./services/scheduler/cronJobs";
import { initLocales } from "./utils/locale";

async function bootstrap(): Promise<void> {
  await initLocales();
  await connectDatabase();
  await connectRedis();

  const client = new BotClient();

  await loadEvents(client);
  await loadCommands(client);
  await loadComponents(client);

  await client.login(env.DISCORD_TOKEN);
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
