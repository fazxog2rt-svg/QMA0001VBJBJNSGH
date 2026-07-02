import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed } from "../../utils/embed";
import { requireActiveQueue } from "../../services/music/guards";
import { formatDuration } from "../../services/music/types";

const LOOP_LABEL = { off: "Nonaktif", track: "Satu lagu", queue: "Antrean" } as const;

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Tampilkan lagu yang sedang diputar."),
  category: "music",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    const queue = await requireActiveQueue(interaction);
    if (!queue || !queue.current) return;

    const track = queue.current;
    const embed = buildEmbed("primary")
      .setTitle("🎵 Sedang Diputar")
      .setDescription(`**[${track.title}](${track.url})**`)
      .addFields(
        { name: "Durasi", value: formatDuration(track.durationSec), inline: true },
        { name: "Volume", value: `${queue.volume}%`, inline: true },
        { name: "Loop", value: LOOP_LABEL[queue.loop], inline: true },
        { name: "Diminta oleh", value: `<@${track.requestedById}>`, inline: true },
        { name: "Antrean berikutnya", value: `${queue.tracks.length} lagu`, inline: true },
      );
    if (track.thumbnail) embed.setThumbnail(track.thumbnail);

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
