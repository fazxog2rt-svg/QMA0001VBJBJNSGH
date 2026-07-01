import path from "node:path";
import type { BotClient } from "../client";
import { logger } from "../services/logger.service";
import type { SlashCommand } from "../types/command";
import { walkTsFiles } from "../utils/fileWalker";

export async function loadCommands(client: BotClient): Promise<void> {
  const commandsDir = path.join(__dirname, "..", "commands");
  const files = walkTsFiles(commandsDir);

  for (const file of files) {
    const imported = (await import(file)) as { default?: SlashCommand };
    const command = imported.default;

    if (!command?.data || typeof command.execute !== "function") {
      logger.warn(`Melewati file command tidak valid: ${file}`);
      continue;
    }

    client.commands.set(command.data.name, command);
  }

  logger.info(`Berhasil memuat ${client.commands.size} slash command.`);
}
