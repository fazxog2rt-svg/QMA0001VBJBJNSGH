import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { prisma } from "@nexusbot/database";
import type { Command } from "../../types/command";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("reactionrole-add")
    .setDescription("Bind an emoji reaction on a message to a role")
    .addStringOption((opt) => opt.setName("message_id").setDescription("The message ID to watch").setRequired(true))
    .addStringOption((opt) => opt.setName("emoji").setDescription("The emoji (unicode or custom emoji ID)").setRequired(true))
    .addRoleOption((opt) => opt.setName("role").setDescription("Role to grant/remove on reaction").setRequired(true))
    .addChannelOption((opt) => opt.setName("channel").setDescription("Channel the message is in (defaults to current)").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const messageId = interaction.options.getString("message_id", true);
    const emoji = interaction.options.getString("emoji", true);
    const role = interaction.options.getRole("role", true);
    const channel = interaction.options.getChannel("channel") ?? interaction.channel;

    if (!channel || !("id" in channel)) {
      await interaction.reply({ content: "Could not resolve a channel.", flags: MessageFlags.Ephemeral });
      return;
    }

    const targetMessage = await interaction.guild.channels
      .fetch(channel.id)
      .then((c) => (c?.isTextBased() ? c.messages.fetch(messageId) : null))
      .catch(() => null);

    if (!targetMessage) {
      await interaction.reply({ content: "Could not find that message in the specified channel.", flags: MessageFlags.Ephemeral });
      return;
    }

    await targetMessage.react(emoji).catch(() => undefined);

    await prisma.reactionRole.create({
      data: {
        guildId: interaction.guild.id,
        messageId,
        channelId: channel.id,
        emoji,
        roleId: role.id,
      },
    });

    await interaction.reply({ content: `Reaction role set: ${emoji} -> ${role.name} on message ${messageId}.`, flags: MessageFlags.Ephemeral });
  },
};

export default command;
