import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { ModerationAction } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { createModerationCase } from "../../features/moderation/caseService";
import { tryDmTarget } from "../../features/moderation/dm";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout (mute) a member for a set duration")
    .addUserOption((opt) => opt.setName("target").setDescription("The member to timeout").setRequired(true))
    .addIntegerOption((opt) =>
      opt.setName("minutes").setDescription("Duration in minutes (max 40320 = 28 days)").setRequired(true).setMinValue(1).setMaxValue(40320),
    )
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the timeout").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const target = interaction.options.getUser("target", true);
    const minutes = interaction.options.getInteger("minutes", true);
    const reason = interaction.options.getString("reason") ?? undefined;

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: "That user is not in this server.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!member.moderatable) {
      await interaction.reply({ content: "I don't have permission to timeout that member.", flags: MessageFlags.Ephemeral });
      return;
    }

    await member.timeout(minutes * 60 * 1000, reason);

    const moderationCase = await createModerationCase({
      guildId: interaction.guild.id,
      targetId: target.id,
      targetTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action: ModerationAction.TIMEOUT,
      reason,
      duration: minutes * 60,
      expiresAt: new Date(Date.now() + minutes * 60_000),
    });

    const dmSent = await tryDmTarget(target, interaction.guild.name, "timeout", reason, `${minutes} minutes`);

    await interaction.reply({
      content: `Timed out ${target.tag} for ${minutes} minute(s) (case #${moderationCase.caseNumber}).${dmSent ? "" : " (Could not DM the user.)"}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
