import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { RoleBackup } from "../../database/models/RoleBackup";
import { askConfirmation } from "../../utils/confirm";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("role-backup")
    .setDescription("[Admin] Backup dan restore role server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand.setName("buat").setDescription("Buat snapshot semua role saat ini."),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("Lihat daftar backup role."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pulihkan")
        .setDescription("Pulihkan role dari backup (membuat ulang role yang hilang).")
        .addStringOption((option) =>
          option.setName("id").setDescription("ID backup.").setRequired(true),
        ),
    ),
  category: "security",
  requiredPermissions: [PermissionFlagsBits.Administrator],
  cooldownSeconds: 5,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "buat") {
      await interaction.deferReply();

      const roles = interaction.guild.roles.cache
        .filter((role) => role.id !== interaction.guild!.id)
        .map((role) => ({
          originalRoleId: role.id,
          name: role.name,
          color: role.color,
          permissions: role.permissions.bitfield.toString(),
          position: role.position,
          hoist: role.hoist,
          mentionable: role.mentionable,
        }));

      const backup = await RoleBackup.create({
        guildId: interaction.guildId,
        createdBy: interaction.user.id,
        roles,
      });

      await interaction.editReply({
        embeds: [
          successEmbed(
            `Backup dibuat dengan **${roles.length} role** (ID: \`${backup._id.toString()}\`).`,
          ),
        ],
      });
      return;
    }

    if (subcommand === "list") {
      const backups = await RoleBackup.find({ guildId: interaction.guildId })
        .sort({ createdAt: -1 })
        .limit(10);
      if (backups.length === 0) {
        await interaction.reply({
          embeds: [errorEmbed("Belum ada backup role.")],
          ephemeral: true,
        });
        return;
      }

      const lines = backups.map(
        (backup) =>
          `\`${backup._id.toString()}\` — ${backup.roles.length} role, dibuat <t:${Math.floor(backup.createdAt.getTime() / 1000)}:R> oleh <@${backup.createdBy}>`,
      );

      await interaction.reply({
        embeds: [buildEmbed("primary").setTitle("💾 Backup Role").setDescription(lines.join("\n"))],
      });
      return;
    }

    const backupId = interaction.options.getString("id", true);
    const backup = await RoleBackup.findOne({ _id: backupId, guildId: interaction.guildId }).catch(
      () => null,
    );

    if (!backup) {
      await interaction.reply({ embeds: [errorEmbed("Backup tidak ditemukan.")], ephemeral: true });
      return;
    }

    await interaction.deferReply();
    const confirmed = await askConfirmation(
      interaction,
      `Ini akan membuat ulang **${backup.roles.length} role** yang tidak lagi ada di server dari backup \`${backupId}\`. Role yang masih ada tidak akan diubah. Lanjutkan?`,
    );

    if (confirmed !== true) {
      await interaction.editReply({
        embeds: [errorEmbed("Pemulihan dibatalkan.")],
        components: [],
      });
      return;
    }

    let restoredCount = 0;
    for (const roleSnapshot of backup.roles) {
      const stillExists = interaction.guild.roles.cache.has(roleSnapshot.originalRoleId);
      if (stillExists) continue;

      await interaction.guild.roles
        .create({
          name: roleSnapshot.name,
          color: roleSnapshot.color,
          permissions: BigInt(roleSnapshot.permissions),
          hoist: roleSnapshot.hoist,
          mentionable: roleSnapshot.mentionable,
          reason: `Restore dari role backup ${backupId}`,
        })
        .then(() => {
          restoredCount += 1;
        })
        .catch(() => undefined);
    }

    await interaction.editReply({
      embeds: [successEmbed(`${restoredCount} role berhasil dipulihkan dari backup.`)],
      components: [],
    });
  },
};

export default command;
