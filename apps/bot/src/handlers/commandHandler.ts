import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "../types/command";
import type { NexusClient } from "../client";
import { childLogger } from "../lib/logger";

const log = childLogger("commandHandler");

/**
 * Recursively walks a directory and returns absolute paths of every .ts/.js
 * file found. Skips files that begin with an underscore (helpers/shared code
 * that isn't itself a command module) and any `index.ts` barrel files.
 */
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

function isCommand(mod: unknown): mod is Command {
  if (!mod || typeof mod !== "object") return false;
  const candidate = mod as Record<string, unknown>;
  return typeof candidate.execute === "function" && !!candidate.data;
}

/**
 * Loads every command module under src/commands/**\/*.ts into client.commands.
 * Each module must default-export (or named-export `command`) an object
 * matching the Command interface: { data, execute }.
 */
export async function loadCommands(client: NexusClient, commandsDir: string): Promise<number> {
  const files = walk(commandsDir);
  let loaded = 0;

  for (const file of files) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = await import(file);
      const command: unknown = mod.default ?? mod.command;
      if (!isCommand(command)) {
        log.warn({ file }, "Skipping module: does not export a valid Command");
        continue;
      }
      client.commands.set(command.data.name, command);
      loaded += 1;
    } catch (err) {
      log.error({ err, file }, "Failed to load command module");
    }
  }

  log.info({ loaded }, "Commands loaded");
  return loaded;
}

/** Registers a single command into the collection, used by the plugin loader. */
export function registerCommand(client: NexusClient, command: Command): void {
  client.commands.set(command.data.name, command);
}
