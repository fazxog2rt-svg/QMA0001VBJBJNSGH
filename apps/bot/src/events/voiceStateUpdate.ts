import { ChannelType, Events, type VoiceState } from "discord.js";
import { prisma } from "@nexusbot/database";
import type { NexusClient } from "../client";
import type { EventModule } from "../types/event";
import { childLogger } from "../lib/logger";

const log = childLogger("voiceStateUpdate");

// discordUserId -> ms timestamp when they joined their current voice channel.
const voiceJoinTimestamps = new Map<string, number>();

function key(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

async function flushVoiceMinutes(guildId: string, userId: string): Promise<void> {
  const k = key(guildId, userId);
  const joinedAt = voiceJoinTimestamps.get(k);
  if (!joinedAt) return;

  const minutes = Math.floor((Date.now() - joinedAt) / 60_000);
  voiceJoinTimestamps.delete(k);
  if (minutes <= 0) return;

  await prisma.guildMember
    .updateMany({
      where: { guildId, discordUserId: userId },
      data: { voiceMinutes: { increment: minutes } },
    })
    .catch((err) => log.error({ err }, "Failed to persist voice minutes"));
}

/**
 * Temp-voice-channel support: if GuildSettings-like config designated a hub
 * channel (stored in AutoModRule-free simple convention: channel named
 * "Join to Create"), joining it spins up a personal voice channel that gets
 * deleted once empty. This is a lightweight heuristic implementation — a
 * dedicated config table can replace the name-matching in a future pass.
 */
const HUB_CHANNEL_NAME = "join to create";

async function handleTempVoiceJoin(newState: VoiceState): Promise<void> {
  const channel = newState.channel;
  if (!channel || channel.type !== ChannelType.GuildVoice) return;
  if (channel.name.toLowerCase() !== HUB_CHANNEL_NAME) return;
  if (!newState.member) return;

  try {
    const created = await newState.guild.channels.create({
      name: `${newState.member.user.username}'s channel`,
      type: ChannelType.GuildVoice,
      parent: channel.parent,
      userLimit: 0,
    });
    await newState.member.voice.setChannel(created).catch(() => undefined);
  } catch (err) {
    log.error({ err }, "Failed to create temp voice channel");
  }
}

async function handleTempVoiceCleanup(oldState: VoiceState): Promise<void> {
  const channel = oldState.channel;
  if (!channel || channel.type !== ChannelType.GuildVoice) return;
  if (channel.name.toLowerCase() === HUB_CHANNEL_NAME) return;
  if (channel.members.size > 0) return;

  // Only clean up channels that look auto-generated ("<name>'s channel") to
  // avoid deleting permanent staff-configured voice channels.
  if (!channel.name.endsWith("'s channel")) return;

  await channel.delete().catch(() => undefined);
}

export default {
  name: Events.VoiceStateUpdate,
  async execute(_client: NexusClient, oldState: VoiceState, newState: VoiceState) {
    const guildId = newState.guild.id;
    const userId = newState.member?.id ?? oldState.member?.id;
    if (!userId) return;

    const wasInChannel = !!oldState.channelId;
    const isInChannel = !!newState.channelId;

    if (!wasInChannel && isInChannel) {
      voiceJoinTimestamps.set(key(guildId, userId), Date.now());
      await handleTempVoiceJoin(newState);
    } else if (wasInChannel && !isInChannel) {
      await flushVoiceMinutes(guildId, userId);
      await handleTempVoiceCleanup(oldState);
    } else if (wasInChannel && isInChannel && oldState.channelId !== newState.channelId) {
      // Switched channels: flush time in old channel, start counting in new one.
      await flushVoiceMinutes(guildId, userId);
      voiceJoinTimestamps.set(key(guildId, userId), Date.now());
      await handleTempVoiceJoin(newState);
      await handleTempVoiceCleanup(oldState);
    }
  },
} satisfies EventModule<Events.VoiceStateUpdate>;
