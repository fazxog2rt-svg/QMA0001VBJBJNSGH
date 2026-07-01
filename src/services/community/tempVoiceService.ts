import { ChannelType, type VoiceState } from "discord.js";
import { GuildConfig } from "../../database/models/GuildConfig";
import { TempVoiceChannel } from "../../database/models/TempVoiceChannel";
import { logger } from "../../services/logger.service";

export async function handleTempVoiceJoin(newState: VoiceState): Promise<void> {
  if (!newState.channelId || !newState.member) return;

  const guildConfig = await GuildConfig.findOne({ guildId: newState.guild.id });
  if (!guildConfig?.tempVoice?.enabled || guildConfig.tempVoice.hubChannelId !== newState.channelId)
    return;

  try {
    const parentId =
      guildConfig.tempVoice.categoryChannelId ?? newState.channel?.parentId ?? undefined;

    const channel = await newState.guild.channels.create({
      name: `🔊 ${newState.member.displayName}`,
      type: ChannelType.GuildVoice,
      parent: parentId,
    });

    await newState.member.voice.setChannel(channel).catch(() => undefined);

    await TempVoiceChannel.create({
      guildId: newState.guild.id,
      channelId: channel.id,
      ownerId: newState.member.id,
    });
  } catch (error) {
    logger.error("Gagal membuat temp voice channel", {
      error: error instanceof Error ? error.message : error,
    });
  }
}

export async function handleTempVoiceCleanup(oldState: VoiceState): Promise<void> {
  if (!oldState.channelId) return;

  const record = await TempVoiceChannel.findOne({ channelId: oldState.channelId });
  if (!record) return;

  const freshChannel = await oldState.guild.channels.fetch(oldState.channelId).catch(() => null);
  if (!freshChannel?.isVoiceBased() || freshChannel.members.size > 0) return;

  await freshChannel.delete().catch(() => undefined);
  await TempVoiceChannel.deleteOne({ channelId: oldState.channelId });
}
