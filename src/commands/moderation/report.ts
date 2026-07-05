import { SlashCommandBuilder, type GuildTextBasedChannel } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("report")
    .setDescription("Laporkan member ke tim moderator.")
    .addUserOption((opt) =>
      opt.setName("member").setDescription("Member yang dilaporkan.").setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("alasan").setDescription("Alasan laporan.").setRequired(true).setMaxLength(1000),
    ),
  category: "moderation",
  cooldownSeconds: 30,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;

    const target = interaction.options.getUser("member", true);
    const reason = interaction.options.getString("alasan", true);

    if (target.bot || target.id === interaction.user.id) {
      await interaction.reply({
        embeds: [errorEmbed("Target laporan tidak valid.")],
        ephemeral: true,
      });
      return;
    }

    const config = await GuildConfig.findOne({ guildId: interaction.guildId });
    const channelId = config?.reportChannelId;
    if (!channelId) {
      await interaction.reply({
        embeds: [errorEmbed("Channel laporan belum diatur. Admin bisa pakai `/report-channel`.")],
        ephemeral: true,
      });
      return;
    }

    const channel = await interaction.guild?.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      await interaction.reply({
        embeds: [errorEmbed("Channel laporan tidak ditemukan. Hubungi admin.")],
        ephemeral: true,
      });
      return;
    }

    const embed = buildEmbed("warning")
      .setTitle("🚨 Laporan Member Baru")
      .addFields(
        { name: "Dilaporkan", value: `${target} (\`${target.id}\`)`, inline: true },
        { name: "Pelapor", value: `${interaction.user}`, inline: true },
        { name: "Channel", value: `<#${interaction.channelId}>`, inline: true },
        { name: "Alasan", value: reason },
      )
      .setThumbnail(target.displayAvatarURL());

    await (channel as GuildTextBasedChannel).send({ embeds: [embed] });

    await interaction.reply({
      embeds: [successEmbed("Laporanmu telah dikirim ke tim moderator. Terima kasih! 🙏")],
      ephemeral: true,
    });
  },
};

export default command;
