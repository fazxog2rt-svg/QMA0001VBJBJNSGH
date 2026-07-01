import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { ModerationAction } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { createModerationCase } from "../../features/moderation/caseService";
import { tryDmTarget } from "../../features/moderation/dm";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("tempban")
    .setDescription("Temporarily ban a member; they are auto-unbanned when the duration expires")
    .addUserOption((opt) => opt.setName("target").setDescription("The member to tempban").setRequired(true))
    .addIntegerOption((opt) =>
      opt.setName("days").setDescription("Ban duration in days").setRequired(true).setMinValue(1).setMaxValue(365),
    )
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the ban").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const target = interaction.options.getUser("target", true);
    const days = interaction.options.getInteger("days", true);
    const reason = interaction.options.getString("reason") ?? undefined;

    const dmSent = await tryDmTarget(target, interaction.guild.name, "temporary ban", reason, `${days} day(s)`);

    await interaction.guild.members.ban(target.id, { reason });

    const expiresAt = new Date(Date.now() + days * 86_400_000);
    const moderationCase = await createModerationCase({
      guildId: interaction.guild.id,
      targetId: target.id,
      targetTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action: ModerationAction.TEMPBAN,
      reason,
      duration: days * 86400,
      expiresAt,
    });

    await interaction.reply({
      content: `Temporarily banned ${target.tag} for ${days} day(s), expires <t:${Math.floor(expiresAt.getTime() / 1000)}:R> (case #${moderationCase.caseNumber}).${dmSent ? "" : " (Could not DM the user.)"}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
