import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type GuildTextBasedChannel,
} from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("report")
    .setDescription("Laporkan member ke moderator, atau atur channel laporan.")
    .addSubcommand((s) =>
      s
        .setName("lapor")
        .setDescription("Laporkan member ke tim moderator.")
        .addUserOption((o) =>
          o.setName("member").setDescription("Member yang dilaporkan.").setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("alasan")
            .setDescription("Alasan laporan.")
            .setRequired(true)
            .setMaxLength(1000),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("channel")
        .setDescription("[Admin] Atur channel tujuan laporan.")
        .addChannelOption((o) =>
          o
            .setName("channel")
            .setDescription("Channel khusus moderator.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    ),
  category: "moderation",
  cooldownSeconds: 15,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild) return;
    const sub = interaction.options.getSubcommand();

    if (sub === "channel") {
      // Cek izin admin di dalam (command ini publik agar /report lapor bisa dipakai semua).
      const perms = interaction.memberPermissions;
      if (!perms?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
          embeds: [errorEmbed("Hanya admin (Manage Server) yang bisa mengatur channel laporan.")],
          ephemeral: true,
        });
        return;
      }
      const channel = interaction.options.getChannel("channel", true);
      await GuildConfig.findOneAndUpdate(
        { guildId: interaction.guildId },
        { $set: { reportChannelId: channel.id } },
        { upsert: true },
      );
      await interaction.reply({
        embeds: [successEmbed(`Laporan \`/report lapor\` sekarang dikirim ke <#${channel.id}>.`)],
        ephemeral: true,
      });
      return;
    }

    // lapor
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
        embeds: [errorEmbed("Channel laporan belum diatur. Admin bisa pakai `/report channel`.")],
        ephemeral: true,
      });
      return;
    }
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) {
      await interaction.reply({
        embeds: [errorEmbed("Channel laporan tidak ditemukan.")],
        ephemeral: true,
      });
      return;
    }

    await (channel as GuildTextBasedChannel).send({
      embeds: [
        buildEmbed("warning")
          .setTitle("🚨 Laporan Member Baru")
          .addFields(
            { name: "Dilaporkan", value: `${target} (\`${target.id}\`)`, inline: true },
            { name: "Pelapor", value: `${interaction.user}`, inline: true },
            { name: "Channel", value: `<#${interaction.channelId}>`, inline: true },
            { name: "Alasan", value: reason },
          )
          .setThumbnail(target.displayAvatarURL()),
      ],
    });
    await interaction.reply({
      embeds: [successEmbed("Laporanmu telah dikirim ke tim moderator. Terima kasih! 🙏")],
      ephemeral: true,
    });
  },
};

export default command;
