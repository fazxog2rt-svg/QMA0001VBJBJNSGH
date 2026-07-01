import { join } from "node:path";
import { prisma } from "@nexusbot/database";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { connectRedis, disconnectRedis } from "./lib/redis";
import { NexusClient } from "./client";
import { loadCommands } from "./handlers/commandHandler";
import { loadEvents } from "./handlers/eventHandler";
import { loadPlugins } from "./handlers/pluginLoader";

async function bootstrap(): Promise<void> {
  logger.info({ env: env.NODE_ENV }, "Starting NexusBot...");

  const client = new NexusClient();

  await connectRedis();
  logger.info("Connected to Redis");

  await loadEvents(client, join(__dirname, "events"));
  await loadCommands(client, join(__dirname, "commands"));
  await loadPlugins(client, join(__dirname, "plugins"));

  await client.login(env.DISCORD_TOKEN);

  let shuttingDown = false;
  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutting down NexusBot...");

    try {
      client.destroy();
      logger.info("Discord client destroyed");
    } catch (err) {
      logger.error({ err }, "Error destroying Discord client");
    }

    try {
      await disconnectRedis();
      logger.info("Redis disconnected");
    } catch (err) {
      logger.error({ err }, "Error disconnecting Redis");
    }

    try {
      await prisma.$disconnect();
      logger.info("Prisma disconnected");
    } catch (err) {
      logger.error({ err }, "Error disconnecting Prisma");
    }

    process.exit(0);
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "Unhandled promise rejection");
  });
  process.on("uncaughtException", (err) => {
    logger.error({ err }, "Uncaught exception");
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, "Fatal error during bootstrap");
  process.exit(1);
});
