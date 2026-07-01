import path from "node:path";
import type { BotClient } from "../client";
import { logger } from "../services/logger.service";
import type { BotEvent } from "../types/event";
import { walkTsFiles } from "../utils/fileWalker";

export async function loadEvents(client: BotClient): Promise<void> {
  const eventsDir = path.join(__dirname, "..", "events");
  const files = walkTsFiles(eventsDir);

  for (const file of files) {
    const imported = (await import(file)) as { default?: BotEvent };
    const event = imported.default;

    if (!event?.name || typeof event.execute !== "function") {
      logger.warn(`Melewati file event tidak valid: ${file}`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
      client.on(event.name, (...args) => event.execute(client, ...args));
    }
  }

  logger.info(`Berhasil memuat ${files.length} event listener.`);
}
