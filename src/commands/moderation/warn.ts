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
    .setName("warn")
    .setDescription("[Moderasi] Beri peringatan ke member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Member yang diperingatkan.").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("alasan")
        .setDescription("Alasan peringatan.")
        .setRequired(true)
        .setMaxLength(500),
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
    const alasan = interaction.options.getString("alasan", true);

    if (!isModerationTargetSafe(interaction.guild, interaction.user.id, target.id)) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu tidak bisa memberi warn ke target ini.")],
        ephemeral: true,
      });
      return;
    }

    const moderationCase = await createModerationCase(
      interaction.guildId,
      "warn",
      target.id,
      interaction.user.id,
      alasan,
    );
    await dmModerationNotice(target, interaction.guild.name, "⚠️ Kamu mendapat peringatan", alasan);

    await ActivityLog.create({
      guildId: interaction.guildId,
      type: "moderation",
      actorId: interaction.user.id,
      targetId: target.id,
      description: `Warn #${moderationCase.caseNumber}: ${alasan}`,
    });

    await interaction.reply({
      embeds: [
        successEmbed(
          `⚠️ <@${target.id}> diberi peringatan (Case #${moderationCase.caseNumber}).\nAlasan: ${alasan}`,
        ),
      ],
    });
  },
};

export default command;
