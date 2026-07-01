import type { ClientEvents } from "discord.js";
import type { BotClient } from "../client";

export interface BotEvent<Key extends keyof ClientEvents = keyof ClientEvents> {
  name: Key;
  once?: boolean;
  execute: (client: BotClient, ...args: ClientEvents[Key]) => Promise<void> | void;
}
