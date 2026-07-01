import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import {
  createModerationCase,
  dmModerationNotice,
  getOrCreateMutedRole,
  isModerationTargetSafe,
} from "../../services/moderation/moderationService";
import { ActivityLog } from "../../database/models";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("[Moderasi] Bisukan member (role Muted, tanpa batas waktu).")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Member yang dibisukan.").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("alasan").setDescription("Alasan mute.").setMaxLength(500),
    ),
  category: "moderation",
  requiredPermissions: [PermissionFlagsBits.ModerateMembers],
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
        embeds: [errorEmbed("Kamu tidak bisa mute target ini.")],
        ephemeral: true,
      });
      return;
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      await interaction.reply({
        embeds: [errorEmbed("Member tidak ditemukan di server ini.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const mutedRoleId = await getOrCreateMutedRole(interaction.guild);
    await member.roles.add(mutedRoleId, alasan);

    const moderationCase = await createModerationCase(
      interaction.guildId,
      "mute",
      target.id,
      interaction.user.id,
      alasan,
    );
    await dmModerationNotice(target, interaction.guild.name, "🔇 Kamu dibisukan", alasan);

    await ActivityLog.create({
      guildId: interaction.guildId,
      type: "moderation",
      actorId: interaction.user.id,
      targetId: target.id,
      description: `Mute #${moderationCase.caseNumber}: ${alasan}`,
    });

    await interaction.editReply({
      embeds: [successEmbed(`🔇 <@${target.id}> dibisukan (Case #${moderationCase.caseNumber}).`)],
    });
  },
};

export default command;
