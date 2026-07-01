import type { EmbedBuilder, Guild } from "discord.js";
import { GuildConfig } from "../../database/models/GuildConfig";

export async function logToSecurityChannel(guild: Guild, embed: EmbedBuilder): Promise<void> {
  const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
  const channelId = guildConfig?.security?.logChannelId;
  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel?.isTextBased()) return;

  await channel.send({ embeds: [embed] }).catch(() => undefined);
}
