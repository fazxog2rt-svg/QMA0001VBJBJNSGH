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
    .setName("kick")
    .setDescription("[Moderasi] Keluarkan member dari server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Member yang dikeluarkan.").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("alasan").setDescription("Alasan kick.").setMaxLength(500),
    ),
  category: "moderation",
  requiredPermissions: [PermissionFlagsBits.KickMembers],
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
        embeds: [errorEmbed("Kamu tidak bisa kick target ini.")],
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

    if (!member.kickable) {
      await interaction.reply({
        embeds: [errorEmbed("Aku tidak punya izin untuk kick member ini (role lebih tinggi).")],
        ephemeral: true,
      });
      return;
    }

    await dmModerationNotice(
      target,
      interaction.guild.name,
      "👢 Kamu dikeluarkan dari server",
      alasan,
    );
    await member.kick(alasan);

    const moderationCase = await createModerationCase(
      interaction.guildId,
      "kick",
      target.id,
      interaction.user.id,
      alasan,
    );

    await ActivityLog.create({
      guildId: interaction.guildId,
      type: "moderation",
      actorId: interaction.user.id,
      targetId: target.id,
      description: `Kick #${moderationCase.caseNumber}: ${alasan}`,
    });

    await interaction.reply({
      embeds: [
        successEmbed(`👢 <@${target.id}> dikeluarkan (Case #${moderationCase.caseNumber}).`),
      ],
    });
  },
};

export default command;
