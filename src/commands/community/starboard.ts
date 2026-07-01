import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("starboard")
    .setDescription("[Admin] Kelola starboard.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("aktifkan")
        .setDescription("Aktifkan starboard.")
        .addChannelOption((option) =>
          option.setName("channel").setDescription("Channel starboard.").setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("threshold")
            .setDescription("Jumlah reaksi minimal (default 5).")
            .setMinValue(1),
        )
        .addStringOption((option) =>
          option.setName("emoji").setDescription("Emoji pemicu (default ⭐)."),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("nonaktifkan").setDescription("Nonaktifkan starboard."),
    ),
  category: "community",
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "aktifkan") {
      const channel = interaction.options.getChannel("channel", true);
      const threshold = interaction.options.getInteger("threshold") ?? 5;
      const emoji = interaction.options.getString("emoji") ?? "⭐";

      await GuildConfig.findOneAndUpdate(
        { guildId: interaction.guildId },
        {
          $set: {
            "starboard.enabled": true,
            "starboard.channelId": channel.id,
            "starboard.threshold": threshold,
            "starboard.emoji": emoji,
          },
        },
        { upsert: true },
      );

      await interaction.reply({
        embeds: [
          successEmbed(
            `Starboard diaktifkan di <#${channel.id}> (minimal ${threshold}x ${emoji}).`,
          ),
        ],
      });
      return;
    }

    await GuildConfig.findOneAndUpdate(
      { guildId: interaction.guildId },
      { $set: { "starboard.enabled": false } },
      { upsert: true },
    );

    await interaction.reply({ embeds: [successEmbed("Starboard dinonaktifkan.")] });
  },
};

export default command;
