import path from "node:path";
import type { BotClient } from "../client";
import { logger } from "../services/logger.service";
import type { ContextMenuCommand } from "../types/command";
import { walkTsFiles } from "../utils/fileWalker";

export async function loadContextMenuCommands(client: BotClient): Promise<void> {
  const contextMenusDir = path.join(__dirname, "..", "context-menus");
  const files = walkTsFiles(contextMenusDir);

  for (const file of files) {
    const imported = (await import(file)) as { default?: ContextMenuCommand };
    const command = imported.default;

    if (!command?.data || typeof command.execute !== "function") {
      logger.warn(`Melewati file context menu command tidak valid: ${file}`);
      continue;
    }

    client.contextMenuCommands.set(command.data.name, command);
  }

  logger.info(`Berhasil memuat ${client.contextMenuCommands.size} context menu command.`);
}
