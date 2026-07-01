import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { ModerationAction } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { createModerationCase } from "../../features/moderation/caseService";
import { tryDmTarget } from "../../features/moderation/dm";

// Softban = ban immediately followed by unban, used purely to purge recent
// message history from a disruptive member without a permanent ban record.
const command: Command = {
  data: new SlashCommandBuilder()
    .setName("softban")
    .setDescription("Ban then immediately unban a member to purge their recent messages")
    .addUserOption((opt) => opt.setName("target").setDescription("The member to softban").setRequired(true))
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the softban").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const target = interaction.options.getUser("target", true);
    const reason = interaction.options.getString("reason") ?? undefined;

    const dmSent = await tryDmTarget(target, interaction.guild.name, "softban", reason);

    await interaction.guild.members.ban(target.id, { reason, deleteMessageSeconds: 86400 });
    await interaction.guild.members.unban(target.id, "Softban: auto-unban after purge").catch(() => undefined);

    const moderationCase = await createModerationCase({
      guildId: interaction.guild.id,
      targetId: target.id,
      targetTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action: ModerationAction.SOFTBAN,
      reason,
    });

    await interaction.reply({
      content: `Softbanned ${target.tag} (case #${moderationCase.caseNumber}).${dmSent ? "" : " (Could not DM the user.)"}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
