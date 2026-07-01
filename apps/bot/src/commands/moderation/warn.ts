import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { ModerationAction } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { createModerationCase } from "../../features/moderation/caseService";
import { tryDmTarget } from "../../features/moderation/dm";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Issue a formal warning to a member")
    .addUserOption((opt) => opt.setName("target").setDescription("The member to warn").setRequired(true))
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the warning").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const target = interaction.options.getUser("target", true);
    const reason = interaction.options.getString("reason") ?? undefined;

    const moderationCase = await createModerationCase({
      guildId: interaction.guild.id,
      targetId: target.id,
      targetTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action: ModerationAction.WARN,
      reason,
    });

    const dmSent = await tryDmTarget(target, interaction.guild.name, "warning", reason);

    await interaction.reply({
      content: `Warned ${target.tag} (case #${moderationCase.caseNumber}).${dmSent ? "" : " (Could not DM the user.)"}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
