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
    .setName("ban")
    .setDescription("[Moderasi] Ban member dari server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Member yang dibanned.").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("alasan").setDescription("Alasan ban.").setMaxLength(500),
    )
    .addIntegerOption((option) =>
      option
        .setName("hapus-pesan-hari")
        .setDescription("Hapus pesan N hari terakhir (0-7).")
        .setMinValue(0)
        .setMaxValue(7),
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
    const deleteMessageDays = interaction.options.getInteger("hapus-pesan-hari") ?? 0;

    if (!isModerationTargetSafe(interaction.guild, interaction.user.id, target.id)) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu tidak bisa ban target ini.")],
        ephemeral: true,
      });
      return;
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (member && !member.bannable) {
      await interaction.reply({
        embeds: [errorEmbed("Aku tidak punya izin untuk ban member ini (role lebih tinggi).")],
        ephemeral: true,
      });
      return;
    }

    await dmModerationNotice(
      target,
      interaction.guild.name,
      "🔨 Kamu dibanned dari server",
      alasan,
    );
    await interaction.guild.members.ban(target.id, {
      reason: alasan,
      deleteMessageSeconds: deleteMessageDays * 86_400,
    });

    const moderationCase = await createModerationCase(
      interaction.guildId,
      "ban",
      target.id,
      interaction.user.id,
      alasan,
    );

    await ActivityLog.create({
      guildId: interaction.guildId,
      type: "moderation",
      actorId: interaction.user.id,
      targetId: target.id,
      description: `Ban #${moderationCase.caseNumber}: ${alasan}`,
    });

    await interaction.reply({
      embeds: [successEmbed(`🔨 <@${target.id}> dibanned (Case #${moderationCase.caseNumber}).`)],
    });
  },
};

export default command;
