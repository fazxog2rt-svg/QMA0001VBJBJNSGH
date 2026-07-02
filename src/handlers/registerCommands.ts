import path from "node:path";
import { REST, Routes } from "discord.js";
import { env } from "../config/env";
import { logger } from "../services/logger.service";
import type { ContextMenuCommand, SlashCommand } from "../types/command";
import { walkTsFiles } from "../utils/fileWalker";

/**
 * Mendaftarkan (deploy) semua slash + context-menu command ke Discord.
 * Dipakai oleh skrip `deploy-commands` dan oleh startup otomatis
 * (AUTO_DEPLOY_COMMANDS) agar tidak perlu akses terminal di panel hosting.
 *
 * `rest.put` bersifat overwrite penuh (idempoten) — aman dijalankan berulang.
 */
export async function registerCommands(): Promise<number> {
  const commandsDir = path.join(__dirname, "..", "commands");
  const contextMenusDir = path.join(__dirname, "..", "context-menus");

  const commandBodies = [];

  for (const file of walkTsFiles(commandsDir)) {
    const imported = (await import(file)) as { default?: SlashCommand };
    if (imported.default?.data) {
      commandBodies.push(imported.default.data.toJSON());
    }
  }

  for (const file of walkTsFiles(contextMenusDir)) {
    const imported = (await import(file)) as { default?: ContextMenuCommand };
    if (imported.default?.data) {
      commandBodies.push(imported.default.data.toJSON());
    }
  }

  const rest = new REST().setToken(env.DISCORD_TOKEN);

  const route = env.DISCORD_DEV_GUILD_ID
    ? Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_DEV_GUILD_ID)
    : Routes.applicationCommands(env.DISCORD_CLIENT_ID);

  await rest.put(route, { body: commandBodies });

  logger.info(
    `Berhasil deploy ${commandBodies.length} command (slash + context menu) ke ${
      env.DISCORD_DEV_GUILD_ID ? `guild ${env.DISCORD_DEV_GUILD_ID}` : "global"
    }.`,
  );

  return commandBodies.length;
}
