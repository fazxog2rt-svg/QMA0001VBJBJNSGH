import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("autorole")
    .setDescription("[Admin] Kelola auto role untuk member baru.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("tambah")
        .setDescription("Tambah auto role.")
        .addRoleOption((option) =>
          option.setName("role").setDescription("Role yang diberikan otomatis.").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("hapus")
        .setDescription("Hapus auto role.")
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Role yang dihapus dari auto role.")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("Lihat semua auto role."),
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
    const guildConfig = await GuildConfig.findOneAndUpdate(
      { guildId: interaction.guildId },
      { $setOnInsert: { guildId: interaction.guildId } },
      { upsert: true, new: true },
    );

    if (subcommand === "tambah") {
      const role = interaction.options.getRole("role", true);

      if (guildConfig.autoRoleIds.includes(role.id)) {
        await interaction.reply({
          embeds: [errorEmbed("Role ini sudah menjadi auto role.")],
          ephemeral: true,
        });
        return;
      }

      guildConfig.autoRoleIds.push(role.id);
      await guildConfig.save();
      await interaction.reply({
        embeds: [successEmbed(`<@&${role.id}> akan diberikan otomatis ke member baru.`)],
      });
      return;
    }

    if (subcommand === "hapus") {
      const role = interaction.options.getRole("role", true);
      const originalLength = guildConfig.autoRoleIds.length;
      guildConfig.autoRoleIds = guildConfig.autoRoleIds.filter((roleId) => roleId !== role.id);

      if (guildConfig.autoRoleIds.length === originalLength) {
        await interaction.reply({
          embeds: [errorEmbed("Role ini bukan auto role.")],
          ephemeral: true,
        });
        return;
      }

      await guildConfig.save();
      await interaction.reply({ embeds: [successEmbed(`<@&${role.id}> dihapus dari auto role.`)] });
      return;
    }

    if (guildConfig.autoRoleIds.length === 0) {
      await interaction.reply({
        embeds: [errorEmbed("Belum ada auto role yang diatur.")],
        ephemeral: true,
      });
      return;
    }

    const lines = guildConfig.autoRoleIds.map((roleId) => `<@&${roleId}>`);
    await interaction.reply({
      embeds: [buildEmbed("primary").setTitle("🤖 Auto Role").setDescription(lines.join("\n"))],
    });
  },
};

export default command;
