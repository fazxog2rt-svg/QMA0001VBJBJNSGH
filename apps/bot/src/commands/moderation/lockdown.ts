import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } from "discord.js";
import { ModerationAction } from "@nexusbot/database";
import type { Command } from "../../types/command";
import { createModerationCase } from "../../features/moderation/caseService";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("lockdown")
    .setDescription("Lock or unlock the current channel for @everyone")
    .addBooleanOption((opt) => opt.setName("unlock").setDescription("Set true to unlock instead of lock").setRequired(false))
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the lockdown").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild || !interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "This command can only be used in a text channel.", flags: MessageFlags.Ephemeral });
      return;
    }

    const unlock = interaction.options.getBoolean("unlock") ?? false;
    const reason = interaction.options.getString("reason") ?? undefined;
    const everyoneRole = interaction.guild.roles.everyone;

    await interaction.channel.permissionOverwrites.edit(
      everyoneRole,
      { SendMessages: unlock ? null : false },
      { reason },
    );

    const moderationCase = await createModerationCase({
      guildId: interaction.guild.id,
      targetId: interaction.channel.id,
      targetTag: `#${interaction.channel.name}`,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action: ModerationAction.LOCKDOWN,
      reason: `${unlock ? "Unlocked" : "Locked"} channel${reason ? `: ${reason}` : ""}`,
    });

    await interaction.reply({
      content: `${unlock ? "Unlocked" : "Locked"} ${interaction.channel} (case #${moderationCase.caseNumber}).`,
    });
  },
};

export default command;
