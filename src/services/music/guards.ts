import { GuildMember, type ChatInputCommandInteraction, type VoiceBasedChannel } from "discord.js";
import { errorEmbed } from "../../utils/embed";
import { getQueue, type GuildMusicQueue } from "./musicManager";

/**
 * Pastikan user berada di voice channel dan (jika bot sudah main) di channel yang
 * sama. Membalas embed error dan mengembalikan null jika syarat tidak terpenuhi.
 */
export async function ensureVoiceContext(
  interaction: ChatInputCommandInteraction,
): Promise<VoiceBasedChannel | null> {
  const member = interaction.member;
  if (!(member instanceof GuildMember) || !member.voice.channel) {
    await interaction.reply({
      embeds: [errorEmbed("Kamu harus berada di voice channel dulu.")],
      ephemeral: true,
    });
    return null;
  }

  const queue = getQueue(interaction.guildId ?? "");
  if (queue && queue.voiceChannelId !== member.voice.channel.id) {
    await interaction.reply({
      embeds: [errorEmbed("Kamu harus berada di voice channel yang sama dengan bot.")],
      ephemeral: true,
    });
    return null;
  }

  return member.voice.channel;
}

/**
 * Ambil antrean aktif untuk guild; balas error dan kembalikan null bila tidak ada
 * lagu yang sedang diputar.
 */
export async function requireActiveQueue(
  interaction: ChatInputCommandInteraction,
): Promise<GuildMusicQueue | null> {
  const queue = getQueue(interaction.guildId ?? "");
  if (!queue || !queue.current) {
    await interaction.reply({
      embeds: [errorEmbed("Tidak ada lagu yang sedang diputar.")],
      ephemeral: true,
    });
    return null;
  }
  return queue;
}
