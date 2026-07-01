import type { VoiceState } from "discord.js";
import type { BotClient } from "../client";
import { awardVoiceXp, handleLevelUpSideEffects } from "../services/leveling/levelingService";
import {
  handleTempVoiceCleanup,
  handleTempVoiceJoin,
} from "../services/community/tempVoiceService";
import { logger } from "../services/logger.service";
import type { BotEvent } from "../types/event";

function sessionKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

async function closeSession(client: BotClient, oldState: VoiceState): Promise<void> {
  const key = sessionKey(oldState.guild.id, oldState.id);
  const startedAt = client.voiceSessions.get(key);
  if (!startedAt) return;

  client.voiceSessions.delete(key);
  const minutes = (Date.now() - startedAt) / 60_000;

  try {
    const result = await awardVoiceXp(oldState.guild.id, oldState.id, minutes);
    if (!result?.leveledUp) return;

    const discordMember =
      oldState.member ?? (await oldState.guild.members.fetch(oldState.id).catch(() => null));
    if (!discordMember) return;

    await handleLevelUpSideEffects(oldState.guild, discordMember, result);
  } catch (error) {
    logger.error("Gagal memproses XP voice", {
      error: error instanceof Error ? error.message : error,
    });
  }
}

const event: BotEvent<"voiceStateUpdate"> = {
  name: "voiceStateUpdate",
  execute: async (client: BotClient, oldState: VoiceState, newState: VoiceState) => {
    if (newState.member?.user.bot) return;

    if (oldState.channelId !== newState.channelId) {
      try {
        if (newState.channelId) await handleTempVoiceJoin(newState);
        if (oldState.channelId) await handleTempVoiceCleanup(oldState);
      } catch (error) {
        logger.error("Gagal memproses temp voice channel", {
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    const afkChannelId = newState.guild.afkChannelId;
    const key = sessionKey(newState.guild.id, newState.id);

    const wasInTrackedChannel = Boolean(oldState.channelId) && oldState.channelId !== afkChannelId;
    const isInTrackedChannel = Boolean(newState.channelId) && newState.channelId !== afkChannelId;

    if (wasInTrackedChannel && !isInTrackedChannel) {
      await closeSession(client, oldState);
      return;
    }

    if (!wasInTrackedChannel && isInTrackedChannel && !client.voiceSessions.has(key)) {
      client.voiceSessions.set(key, Date.now());
    }
  },
};

export default event;
