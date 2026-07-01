import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("[Admin] Atur pesan selamat datang & perpisahan.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("channel")
        .setDescription("Atur channel selamat datang.")
        .addChannelOption((option) =>
          option.setName("channel").setDescription("Channel welcome.").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pesan")
        .setDescription(
          "Atur template pesan selamat datang. Variabel: {user} {server} {memberCount}",
        )
        .addStringOption((option) =>
          option
            .setName("template")
            .setDescription("Template pesan.")
            .setRequired(true)
            .setMaxLength(500),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("goodbye-channel")
        .setDescription("Atur channel perpisahan.")
        .addChannelOption((option) =>
          option.setName("channel").setDescription("Channel goodbye.").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("goodbye-pesan")
        .setDescription("Atur template pesan perpisahan. Variabel: {user} {server} {memberCount}")
        .addStringOption((option) =>
          option
            .setName("template")
            .setDescription("Template pesan.")
            .setRequired(true)
            .setMaxLength(500),
        ),
    ),
  category: "community",
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "channel") {
      const channel = interaction.options.getChannel("channel", true);
      await GuildConfig.findOneAndUpdate(
        { guildId: interaction.guildId },
        { $set: { welcomeChannelId: channel.id } },
        { upsert: true },
      );
      await interaction.reply({
        embeds: [successEmbed(`Channel selamat datang diatur ke <#${channel.id}>.`)],
      });
      return;
    }

    if (subcommand === "pesan") {
      const template = interaction.options.getString("template", true);
      await GuildConfig.findOneAndUpdate(
        { guildId: interaction.guildId },
        { $set: { welcomeMessage: template } },
        { upsert: true },
      );
      await interaction.reply({
        embeds: [successEmbed("Template pesan selamat datang diperbarui.")],
      });
      return;
    }

    if (subcommand === "goodbye-channel") {
      const channel = interaction.options.getChannel("channel", true);
      await GuildConfig.findOneAndUpdate(
        { guildId: interaction.guildId },
        { $set: { goodbyeChannelId: channel.id } },
        { upsert: true },
      );
      await interaction.reply({
        embeds: [successEmbed(`Channel perpisahan diatur ke <#${channel.id}>.`)],
      });
      return;
    }

    const template = interaction.options.getString("template", true);
    await GuildConfig.findOneAndUpdate(
      { guildId: interaction.guildId },
      { $set: { goodbyeMessage: template } },
      { upsert: true },
    );
    await interaction.reply({ embeds: [successEmbed("Template pesan perpisahan diperbarui.")] });
  },
};

export default command;
