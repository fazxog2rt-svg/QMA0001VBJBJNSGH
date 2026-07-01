import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { NexusClient } from "../client";
import type { NexusPlugin } from "../types/plugin";
import { registerCommand } from "./commandHandler";
import { bindEvent } from "./eventHandler";
import { childLogger } from "../lib/logger";

const log = childLogger("pluginLoader");

function isPlugin(mod: unknown): mod is NexusPlugin {
  if (!mod || typeof mod !== "object") return false;
  const candidate = mod as Record<string, unknown>;
  return typeof candidate.key === "string" && typeof candidate.name === "string";
}

/**
 * Scans src/plugins/*\/plugin.ts, imports each, merges their commands/events
 * into the core command/event registries, and calls onLoad. This is the
 * mechanism the product spec calls "add features without touching core" —
 * new feature systems (music, casino games, fishing/mining economy loops,
 * marketplaces, pet battling, etc.) can all ship as self-contained plugins
 * that never modify src/commands, src/events, or src/features directly.
 */
export async function loadPlugins(client: NexusClient, pluginsDir: string): Promise<number> {
  let loaded = 0;
  if (!existsSync(pluginsDir)) return loaded;

  let entries: string[];
  try {
    entries = readdirSync(pluginsDir);
  } catch {
    return loaded;
  }

  for (const entry of entries) {
    const pluginDir = join(pluginsDir, entry);
    if (!statSync(pluginDir).isDirectory()) continue;

    const tsPath = join(pluginDir, "plugin.ts");
    const jsPath = join(pluginDir, "plugin.js");
    const entryPath = existsSync(tsPath) ? tsPath : existsSync(jsPath) ? jsPath : null;
    if (!entryPath) continue;

    try {
      const mod = await import(entryPath);
      const plugin: unknown = mod.default ?? mod.plugin;
      if (!isPlugin(plugin)) {
        log.warn({ dir: pluginDir }, "Skipping directory: does not export a valid NexusPlugin");
        continue;
      }

      for (const command of plugin.commands ?? []) {
        registerCommand(client, command);
      }
      for (const eventModule of plugin.events ?? []) {
        bindEvent(client, eventModule);
      }

      await plugin.onLoad?.(client);

      client.plugins.set(plugin.key, plugin);
      loaded += 1;
      log.info(
        { key: plugin.key, name: plugin.name, commands: plugin.commands?.length ?? 0, events: plugin.events?.length ?? 0 },
        "Plugin loaded",
      );
    } catch (err) {
      log.error({ err, dir: pluginDir }, "Failed to load plugin");
    }
  }

  log.info({ loaded }, "Plugins loaded");
  return loaded;
}
