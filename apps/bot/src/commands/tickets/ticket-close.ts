import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import type { Command } from "../../types/command";
import { closeTicket, getOpenTicketByChannel } from "../../features/tickets/service";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ticket-close")
    .setDescription("Close the ticket in this channel")
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason for closing").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const reason = interaction.options.getString("reason") ?? undefined;

    const ticket = await getOpenTicketByChannel(interaction.channelId);
    if (!ticket) {
      await interaction.reply({ content: "This channel is not an open ticket.", flags: MessageFlags.Ephemeral });
      return;
    }

    await closeTicket(interaction.guild.id, ticket.id, reason ?? `Closed by ${interaction.user.tag}`);
    await interaction.reply(`Ticket #${ticket.ticketNumber} closed. This channel will be deleted in 5 seconds.`);

    setTimeout(() => {
      interaction.channel?.delete().catch(() => undefined);
    }, 5000);
  },
};

export default command;
