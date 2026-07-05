import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("report-channel")
    .setDescription("[Admin] Atur channel tujuan laporan /report.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Channel tujuan laporan (khusus moderator).")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    ),
  category: "moderation",
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;
    const channel = interaction.options.getChannel("channel", true);

    await GuildConfig.findOneAndUpdate(
      { guildId: interaction.guildId },
      { $set: { reportChannelId: channel.id } },
      { upsert: true },
    );

    await interaction.reply({
      embeds: [successEmbed(`Laporan \`/report\` sekarang dikirim ke <#${channel.id}>.`)],
      ephemeral: true,
    });
  },
};

export default command;
