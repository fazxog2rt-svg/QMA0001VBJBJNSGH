import type { NexusClient } from "../client";
import type { Command } from "./command";
import type { EventModule } from "./event";

/**
 * NexusPlugin is the extensibility seam for the whole bot: "add features
 * without touching core." A plugin lives at src/plugins/<key>/plugin.ts,
 * exports a default NexusPlugin, and the pluginLoader wires its commands and
 * events into the same Collections used by core commands/events — from the
 * dispatcher's point of view a plugin command is indistinguishable from a
 * core command.
 *
 * Guild-level enable/disable is backed by the GuildPlugin model
 * (guildId + pluginKey unique), so operators can toggle plugins per-guild
 * from the dashboard without a redeploy.
 */
export interface NexusPlugin {
  /** Unique, stable key. Matches GuildPlugin.pluginKey in the database. */
  key: string;
  name: string;
  description: string;
  commands?: Command[];
  events?: EventModule[];
  /** Called once after the plugin's commands/events are registered. */
  onLoad?(client: NexusClient): Promise<void> | void;
}
