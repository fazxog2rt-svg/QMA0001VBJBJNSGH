import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { createModerationCase } from "../../services/moderation/moderationService";
import { ActivityLog } from "../../database/models";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("[Moderasi] Cabut timeout dari member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Member yang di-untimeout.").setRequired(true),
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
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member?.isCommunicationDisabled()) {
      await interaction.reply({
        embeds: [errorEmbed("Member ini tidak sedang di-timeout.")],
        ephemeral: true,
      });
      return;
    }

    await member.timeout(null, "Timeout dicabut manual");
    const moderationCase = await createModerationCase(
      interaction.guildId,
      "timeout",
      target.id,
      interaction.user.id,
      "Timeout dicabut",
    );

    await ActivityLog.create({
      guildId: interaction.guildId,
      type: "moderation",
      actorId: interaction.user.id,
      targetId: target.id,
      description: `Timeout dicabut #${moderationCase.caseNumber}`,
    });

    await interaction.reply({
      embeds: [
        successEmbed(`✅ Timeout <@${target.id}> dicabut (Case #${moderationCase.caseNumber}).`),
      ],
    });
  },
};

export default command;
