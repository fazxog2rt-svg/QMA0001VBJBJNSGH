/**
 * Registers the bot's slash commands with Discord. Run via `npm run deploy-commands`.
 *
 * If DISCORD_DEV_GUILD_ID is set, commands are registered to that guild only
 * (near-instant propagation, ideal for local development). Otherwise commands
 * are registered globally (can take up to an hour to propagate to all guilds).
 */
import { REST, Routes } from "discord.js";
import { join } from "node:path";
import { readdirSync, statSync } from "node:fs";
import { env } from "../config/env";
import { childLogger } from "../lib/logger";
import type { Command } from "../types/command";

const log = childLogger("deployCommands");

function walk(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full));
    } else if (
      (entry.endsWith(".ts") || entry.endsWith(".js")) &&
      !entry.endsWith(".d.ts") &&
      !entry.startsWith("_") &&
      entry !== "index.ts" &&
      entry !== "index.js"
    ) {
      out.push(full);
    }
  }
  return out;
}

async function collectCommandPayloads(): Promise<unknown[]> {
  const payloads: unknown[] = [];

  const commandsDir = join(__dirname, "..", "commands");
  for (const file of walk(commandsDir)) {
    try {
      const mod = await import(file);
      const command: Command | undefined = mod.default ?? mod.command;
      if (command?.data) payloads.push(command.data.toJSON());
    } catch (err) {
      log.error({ err, file }, "Failed to load command for deploy");
    }
  }

  const pluginsDir = join(__dirname, "..", "plugins");
  let pluginEntries: string[] = [];
  try {
    pluginEntries = readdirSync(pluginsDir);
  } catch {
    pluginEntries = [];
  }
  for (const entry of pluginEntries) {
    const pluginFile = join(pluginsDir, entry, "plugin.ts");
    try {
      const mod = await import(pluginFile);
      const plugin = mod.default ?? mod.plugin;
      for (const command of plugin?.commands ?? []) {
        payloads.push(command.data.toJSON());
      }
    } catch {
      // plugin.ts may not exist for this entry; ignore
    }
  }

  return payloads;
}

async function main() {
  const payloads = await collectCommandPayloads();
  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

  if (env.DISCORD_DEV_GUILD_ID) {
    log.info(
      { count: payloads.length, guildId: env.DISCORD_DEV_GUILD_ID },
      "Registering guild commands",
    );
    await rest.put(
      Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_DEV_GUILD_ID),
      { body: payloads },
    );
  } else {
    log.info({ count: payloads.length }, "Registering global commands");
    await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: payloads });
  }

  log.info("Command deployment complete");
}

main().catch((err) => {
  log.error({ err }, "Command deployment failed");
  process.exit(1);
});
