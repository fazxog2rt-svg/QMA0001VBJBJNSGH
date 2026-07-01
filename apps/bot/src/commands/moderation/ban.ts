import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { ModerationAction } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { createModerationCase } from "../../features/moderation/caseService";
import { tryDmTarget } from "../../features/moderation/dm";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Permanently ban a member from the server")
    .addUserOption((opt) => opt.setName("target").setDescription("The member to ban").setRequired(true))
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the ban").setRequired(false))
    .addIntegerOption((opt) =>
      opt.setName("delete_days").setDescription("Days of message history to delete (0-7)").setMinValue(0).setMaxValue(7).setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const target = interaction.options.getUser("target", true);
    const reason = interaction.options.getString("reason") ?? undefined;
    const deleteDays = interaction.options.getInteger("delete_days") ?? 0;

    const dmSent = await tryDmTarget(target, interaction.guild.name, "ban", reason);

    await interaction.guild.members.ban(target.id, {
      reason,
      deleteMessageSeconds: deleteDays * 86400,
    });

    const moderationCase = await createModerationCase({
      guildId: interaction.guild.id,
      targetId: target.id,
      targetTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action: ModerationAction.BAN,
      reason,
    });

    await interaction.reply({
      content: `Banned ${target.tag} (case #${moderationCase.caseNumber}).${dmSent ? "" : " (Could not DM the user.)"}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
