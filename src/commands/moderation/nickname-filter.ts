import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("nickname-filter")
    .setDescription("[Admin] Kelola daftar kata terlarang di nickname.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("tambah")
        .setDescription("Tambah kata terlarang.")
        .addStringOption((option) =>
          option.setName("kata").setDescription("Kata yang dilarang.").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("hapus")
        .setDescription("Hapus kata terlarang.")
        .addStringOption((option) =>
          option.setName("kata").setDescription("Kata yang dihapus.").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("Lihat semua kata terlarang."),
    ),
  category: "moderation",
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
    const guildConfig = await GuildConfig.findOneAndUpdate(
      { guildId: interaction.guildId },
      { $setOnInsert: { guildId: interaction.guildId } },
      { upsert: true, new: true },
    );

    const moderation = guildConfig.moderation!;

    if (subcommand === "tambah") {
      const kata = interaction.options.getString("kata", true).toLowerCase();
      if (moderation.nicknameFilterWords.includes(kata)) {
        await interaction.reply({
          embeds: [errorEmbed("Kata ini sudah ada di daftar.")],
          ephemeral: true,
        });
        return;
      }
      moderation.nicknameFilterWords.push(kata);
      await guildConfig.save();
      await interaction.reply({
        embeds: [successEmbed(`Kata \`${kata}\` ditambahkan ke filter nickname.`)],
      });
      return;
    }

    if (subcommand === "hapus") {
      const kata = interaction.options.getString("kata", true).toLowerCase();
      const originalLength = moderation.nicknameFilterWords.length;
      moderation.nicknameFilterWords = moderation.nicknameFilterWords.filter(
        (word) => word !== kata,
      );

      if (moderation.nicknameFilterWords.length === originalLength) {
        await interaction.reply({
          embeds: [errorEmbed("Kata ini tidak ada di daftar.")],
          ephemeral: true,
        });
        return;
      }

      await guildConfig.save();
      await interaction.reply({
        embeds: [successEmbed(`Kata \`${kata}\` dihapus dari filter nickname.`)],
      });
      return;
    }

    if (moderation.nicknameFilterWords.length === 0) {
      await interaction.reply({
        embeds: [errorEmbed("Belum ada kata terlarang.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      embeds: [
        buildEmbed("primary")
          .setTitle("🚫 Filter Nickname")
          .setDescription(moderation.nicknameFilterWords.map((word) => `\`${word}\``).join(", ")),
      ],
    });
  },
};

export default command;
