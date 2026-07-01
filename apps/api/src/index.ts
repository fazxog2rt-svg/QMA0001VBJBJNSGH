import http from "node:http";
import { prisma } from "@nexusbot/database";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { connectRedis, disconnectRedis } from "./lib/redis";
import { createSocketServer, startRealtimeRelay } from "./lib/socket";

async function main() {
  await connectRedis();

  const app = createApp();
  const httpServer = http.createServer(app);

  createSocketServer(httpServer);
  await startRealtimeRelay();

  httpServer.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "NexusBot API listening");
  });

  let shuttingDown = false;
  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutting down gracefully...");

    const forceExitTimer = setTimeout(() => {
      logger.error("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, 10_000);
    forceExitTimer.unref();

    httpServer.close(() => logger.info("HTTP server closed"));

    try {
      await disconnectRedis();
      await prisma.$disconnect();
    } catch (err) {
      logger.error({ err }, "Error during shutdown");
    } finally {
      clearTimeout(forceExitTimer);
      process.exit(0);
    }
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "Unhandled promise rejection");
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal error during startup");
  process.exit(1);
});
