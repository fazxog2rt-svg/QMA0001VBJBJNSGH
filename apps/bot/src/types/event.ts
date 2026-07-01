import type { ClientEvents } from "discord.js";
import type { NexusClient } from "../client";

export interface EventModule<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute(client: NexusClient, ...args: ClientEvents[K]): Promise<void> | void;
}
