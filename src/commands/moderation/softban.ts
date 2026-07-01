import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import {
  createModerationCase,
  dmModerationNotice,
  isModerationTargetSafe,
} from "../../services/moderation/moderationService";
import { ActivityLog } from "../../database/models";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("softban")
    .setDescription("[Moderasi] Ban lalu langsung unban untuk menghapus riwayat pesan member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Member yang di-softban.").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("alasan").setDescription("Alasan softban.").setMaxLength(500),
    ),
  category: "moderation",
  requiredPermissions: [PermissionFlagsBits.BanMembers],
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const target = interaction.options.getUser("user", true);
    const alasan = interaction.options.getString("alasan") ?? "Tidak ada alasan diberikan.";

    if (!isModerationTargetSafe(interaction.guild, interaction.user.id, target.id)) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu tidak bisa softban target ini.")],
        ephemeral: true,
      });
      return;
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (member && !member.bannable) {
      await interaction.reply({
        embeds: [errorEmbed("Aku tidak punya izin untuk softban member ini (role lebih tinggi).")],
        ephemeral: true,
      });
      return;
    }

    await dmModerationNotice(
      target,
      interaction.guild.name,
      "🧹 Kamu di-softban dari server",
      alasan,
      "Kamu bisa join kembali kapan saja.",
    );

    await interaction.guild.members.ban(target.id, {
      reason: `Softban: ${alasan}`,
      deleteMessageSeconds: 86_400,
    });
    await interaction.guild.members.unban(target.id, "Softban selesai");

    const moderationCase = await createModerationCase(
      interaction.guildId,
      "softban",
      target.id,
      interaction.user.id,
      alasan,
    );

    await ActivityLog.create({
      guildId: interaction.guildId,
      type: "moderation",
      actorId: interaction.user.id,
      targetId: target.id,
      description: `Softban #${moderationCase.caseNumber}: ${alasan}`,
    });

    await interaction.reply({
      embeds: [successEmbed(`🧹 <@${target.id}> di-softban (Case #${moderationCase.caseNumber}).`)],
    });
  },
};

export default command;
