import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  MessageContextMenuCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  UserContextMenuCommandInteraction,
  ContextMenuCommandBuilder,
} from "discord.js";
import type { BotClient } from "../client";

export type SlashCommandData =
  SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;

export interface CommandCategory {
  key: string;
  label: string;
  emoji: string;
}

export interface SlashCommand {
  data: SlashCommandData;
  category: string;
  cooldownSeconds?: number;
  ownerOnly?: boolean;
  requiredPermissions?: bigint[];
  execute: (interaction: ChatInputCommandInteraction, client: BotClient) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction, client: BotClient) => Promise<void>;
}

export interface ContextMenuCommand {
  data: ContextMenuCommandBuilder;
  cooldownSeconds?: number;
  execute: (
    interaction: UserContextMenuCommandInteraction | MessageContextMenuCommandInteraction,
    client: BotClient,
  ) => Promise<void>;
}
