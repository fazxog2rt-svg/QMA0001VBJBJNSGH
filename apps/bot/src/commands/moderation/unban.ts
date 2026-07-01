import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { ModerationAction } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { createModerationCase, deactivateActiveCases } from "../../features/moderation/caseService";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user by their Discord ID")
    .addStringOption((opt) => opt.setName("user_id").setDescription("Discord user ID to unban").setRequired(true))
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the unban").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const userId = interaction.options.getString("user_id", true);
    const reason = interaction.options.getString("reason") ?? undefined;

    const banEntry = await interaction.guild.bans.fetch(userId).catch(() => null);
    if (!banEntry) {
      await interaction.reply({ content: "That user is not banned.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.guild.members.unban(userId, reason);
    await deactivateActiveCases(interaction.guild.id, userId, [
      ModerationAction.BAN,
      ModerationAction.TEMPBAN,
      ModerationAction.SOFTBAN,
    ]);

    const moderationCase = await createModerationCase({
      guildId: interaction.guild.id,
      targetId: userId,
      targetTag: banEntry.user.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action: ModerationAction.UNBAN,
      reason,
    });

    await interaction.reply({
      content: `Unbanned ${banEntry.user.tag} (case #${moderationCase.caseNumber}).`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
