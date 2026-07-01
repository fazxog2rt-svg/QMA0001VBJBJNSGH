import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import type { Command } from "./types/command";
import type { NexusPlugin } from "./types/plugin";

export interface AfkEntry {
  reason: string;
  since: Date;
}

export interface InviteCacheEntry {
  code: string;
  uses: number;
  inviterId: string | null;
}

export class NexusClient extends Client {
  /** Slash command name -> Command, includes core + plugin commands. */
  public readonly commands = new Collection<string, Command>();

  /** `${userId}:${commandName}` -> unix ms when the cooldown expires. */
  public readonly cooldowns = new Collection<string, number>();

  /** Loaded plugin registry, keyed by plugin key. */
  public readonly plugins = new Collection<string, NexusPlugin>();

  /** guildId -> Map<inviteCode, InviteCacheEntry>, used for invite-tracking diffing. */
  public readonly inviteCache = new Collection<string, Map<string, InviteCacheEntry>>();

  /** `${guildId}:${userId}` -> AfkEntry, in-memory AFK status. */
  public readonly afkUsers = new Collection<string, AfkEntry>();

  /** Rolling counters used for bot.stats realtime publishing. */
  public commandsExecuted = 0;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildExpressions,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember],
    });
  }
}
