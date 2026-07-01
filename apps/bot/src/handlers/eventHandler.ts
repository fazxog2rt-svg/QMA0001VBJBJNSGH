import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ClientEvents } from "discord.js";
import type { NexusClient } from "../client";
import type { EventModule } from "../types/event";
import { childLogger } from "../lib/logger";

const log = childLogger("eventHandler");

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

function isEventModule(mod: unknown): mod is EventModule {
  if (!mod || typeof mod !== "object") return false;
  const candidate = mod as Record<string, unknown>;
  return typeof candidate.name === "string" && typeof candidate.execute === "function";
}

/** Binds a single EventModule to the client, used by both the core loader and pluginLoader. */
export function bindEvent(client: NexusClient, mod: EventModule): void {
  const handler = (...args: ClientEvents[typeof mod.name]) => mod.execute(client, ...args);
  if (mod.once) {
    client.once(mod.name, handler as never);
  } else {
    client.on(mod.name, handler as never);
  }
}

/** Loads every event module under src/events/**\/*.ts and binds it to the client. */
export async function loadEvents(client: NexusClient, eventsDir: string): Promise<number> {
  const files = walk(eventsDir);
  let loaded = 0;

  for (const file of files) {
    try {
      const mod = await import(file);
      const eventModule: unknown = mod.default ?? mod.event;
      if (!isEventModule(eventModule)) {
        log.warn({ file }, "Skipping module: does not export a valid EventModule");
        continue;
      }
      bindEvent(client, eventModule);
      loaded += 1;
    } catch (err) {
      log.error({ err, file }, "Failed to load event module");
    }
  }

  log.info({ loaded }, "Events loaded");
  return loaded;
}
