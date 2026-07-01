import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import type { NexusClient } from "../client";

export type SlashCommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;

export interface Command {
  data: SlashCommandData;
  /** Per-command cooldown in seconds. Defaults to 3s if omitted. */
  cooldownSeconds?: number;
  /** If true, only usable inside a guild (default true for almost everything). */
  guildOnly?: boolean;
  execute(interaction: ChatInputCommandInteraction, client: NexusClient): Promise<void>;
}
