import { env } from "./config/env";
import { logger } from "./lib/logger";
import { ProcessManager } from "./process-manager";
import { connectAgentSocket } from "./socket";

logger.info(
  { apiUrl: env.NEXUS_API_URL, startCommand: env.NEXUS_START_COMMAND, workingDir: env.NEXUS_WORKING_DIR },
  "NexusBot agent starting",
);

const processManager = new ProcessManager();
processManager.on("log", (payload) => {
  const prefix = payload.stream === "stderr" ? "[stderr]" : payload.stream === "system" ? "[agent]" : "[stdout]";
  logger.info(`${prefix} ${payload.line}`);
});

const socket = connectAgentSocket(processManager);

function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down agent");
  processManager.shutdown();
  socket.disconnect();
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
