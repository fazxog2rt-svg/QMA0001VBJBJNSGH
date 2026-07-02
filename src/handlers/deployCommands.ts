import { logger } from "../services/logger.service";
import { registerCommands } from "./registerCommands";

registerCommands().catch((error) => {
  logger.error("Gagal deploy slash command", { error });
  process.exit(1);
});
