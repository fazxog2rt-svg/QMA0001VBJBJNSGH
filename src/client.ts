import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import type { ContextMenuCommand, SlashCommand } from "./types/command";
import type { ButtonComponent, ModalComponent, SelectMenuComponent } from "./types/component";

export class BotClient extends Client {
  public readonly commands = new Collection<string, SlashCommand>();
  public readonly contextMenuCommands = new Collection<string, ContextMenuCommand>();
  public readonly buttons = new Collection<string, ButtonComponent>();
  public readonly selectMenus = new Collection<string, SelectMenuComponent>();
  public readonly modals = new Collection<string, ModalComponent>();
  public readonly cooldowns = new Collection<string, Collection<string, number>>();
  public readonly inviteCache = new Collection<string, Collection<string, number>>();
  /** Voice XP session tracking, keyed by `${guildId}:${userId}` -> session start timestamp (ms). */
  public readonly voiceSessions = new Collection<string, number>();

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember],
    });
  }
}
