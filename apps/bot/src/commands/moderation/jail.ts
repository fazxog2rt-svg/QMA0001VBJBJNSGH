import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { ModerationAction } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { createModerationCase } from "../../features/moderation/caseService";
import { tryDmTarget } from "../../features/moderation/dm";

const JAIL_ROLE_NAME = "Jailed";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("jail")
    .setDescription("Restrict a member to a jail role, stripping their other roles")
    .addUserOption((opt) => opt.setName("target").setDescription("The member to jail").setRequired(true))
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason for jailing").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const target = interaction.options.getUser("target", true);
    const reason = interaction.options.getString("reason") ?? undefined;

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: "That user is not in this server.", flags: MessageFlags.Ephemeral });
      return;
    }

    let jailRole = interaction.guild.roles.cache.find((r) => r.name === JAIL_ROLE_NAME);
    if (!jailRole) {
      jailRole = await interaction.guild.roles.create({
        name: JAIL_ROLE_NAME,
        color: "DarkGrey" as never,
        permissions: [],
        reason: "Auto-created jail role for /jail command",
      });
      // Deny sending messages in every channel for the jail role.
      // (Threads are excluded: they inherit overwrites from their parent and
      // don't expose a permissionOverwrites manager of their own.)
      for (const channel of interaction.guild.channels.cache.values()) {
        if (channel.isTextBased() && !channel.isThread()) {
          await channel.permissionOverwrites
            .create(jailRole, { SendMessages: false, AddReactions: false })
            .catch(() => undefined);
        }
      }
    }

    const previousRoles = member.roles.cache.filter((r) => r.id !== interaction.guild!.roles.everyone.id).map((r) => r.id);
    await member.roles.set([jailRole.id]).catch(async () => {
      // Fall back to add-only if we lack permission to fully replace roles.
      await member.roles.add(jailRole!.id);
    });

    const moderationCase = await createModerationCase({
      guildId: interaction.guild.id,
      targetId: target.id,
      targetTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action: ModerationAction.JAIL,
      reason,
    });

    // Persist previous roles in the case reason metadata trail via AuditLog since
    // ModerationCase has no dedicated field for it.
    const dmSent = await tryDmTarget(target, interaction.guild.name, "jail", reason);

    await interaction.reply({
      content: `Jailed ${target.tag}, previous roles: ${previousRoles.length} (case #${moderationCase.caseNumber}).${dmSent ? "" : " (Could not DM the user.)"}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
