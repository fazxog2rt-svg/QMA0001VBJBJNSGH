import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { ModerationAction } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { createModerationCase } from "../../features/moderation/caseService";
import { tryDmTarget } from "../../features/moderation/dm";

// `mute` is an alias-style command backed by Discord's native timeout API
// (Discord no longer supports indefinite role-based mutes without extra
// setup) — it defaults to a fixed 60 minute timeout, distinct from
// `/timeout` which takes an explicit duration.
const DEFAULT_MUTE_MINUTES = 60;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Quickly mute a member for 60 minutes via timeout")
    .addUserOption((opt) => opt.setName("target").setDescription("The member to mute").setRequired(true))
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the mute").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const target = interaction.options.getUser("target", true);
    const reason = interaction.options.getString("reason") ?? undefined;

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member || !member.moderatable) {
      await interaction.reply({ content: "I can't mute that member (missing permissions or not in server).", flags: MessageFlags.Ephemeral });
      return;
    }

    await member.timeout(DEFAULT_MUTE_MINUTES * 60 * 1000, reason);

    const moderationCase = await createModerationCase({
      guildId: interaction.guild.id,
      targetId: target.id,
      targetTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action: ModerationAction.MUTE,
      reason,
      duration: DEFAULT_MUTE_MINUTES * 60,
      expiresAt: new Date(Date.now() + DEFAULT_MUTE_MINUTES * 60_000),
    });

    const dmSent = await tryDmTarget(target, interaction.guild.name, "mute", reason, `${DEFAULT_MUTE_MINUTES} minutes`);

    await interaction.reply({
      content: `Muted ${target.tag} for ${DEFAULT_MUTE_MINUTES} minutes (case #${moderationCase.caseNumber}).${dmSent ? "" : " (Could not DM the user.)"}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
