import { SlashCommandBuilder, type GuildTextBasedChannel } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed, errorEmbed } from "../../utils/embed";
import { ensureVoiceContext } from "../../services/music/guards";
import { createQueue, getQueue, resolveTrack } from "../../services/music/musicManager";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Putar lagu dari YouTube (judul atau URL).")
    .addStringOption((option) =>
      option.setName("lagu").setDescription("Judul lagu atau URL YouTube").setRequired(true),
    ),
  category: "music",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    const voiceChannel = await ensureVoiceContext(interaction);
    if (!voiceChannel || !interaction.guild) return;

    await interaction.deferReply();

    const query = interaction.options.getString("lagu", true);
    const track = await resolveTrack(query, interaction.user.id, interaction.user.tag);

    if (!track) {
      await interaction.editReply({ embeds: [errorEmbed(`Tidak ada hasil untuk **${query}**.`)] });
      return;
    }

    let queue = getQueue(interaction.guild.id);
    const startedEmpty = !queue?.current;
    try {
      queue ??= await createQueue(
        interaction.guild,
        voiceChannel,
        interaction.channel as GuildTextBasedChannel,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "timeout";
      await interaction.editReply({
        embeds: [
          errorEmbed(
            `Gagal terhubung ke voice channel: ${detail}. ` +
              "Jika ini timeout, kemungkinan hosting memblokir koneksi UDP untuk voice.",
          ),
        ],
      });
      return;
    }

    queue.enqueue(track);
    await queue.start();

    const embed = buildEmbed("success")
      .setTitle(startedEmpty ? "▶️ Sekarang Memutar" : "➕ Ditambahkan ke Antrean")
      .setDescription(`**[${track.title}](${track.url})**`)
      .addFields(
        { name: "Durasi", value: track.durationLabel, inline: true },
        { name: "Diminta oleh", value: `<@${track.requestedById}>`, inline: true },
      );
    if (!startedEmpty) {
      embed.addFields({ name: "Posisi antrean", value: `#${queue.tracks.length}`, inline: true });
    }
    if (track.thumbnail) embed.setThumbnail(track.thumbnail);

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
