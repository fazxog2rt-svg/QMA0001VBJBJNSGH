import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  type ButtonInteraction,
} from "discord.js";
import { prisma } from "@nexusbot/database";
import type { NexusClient } from "../../client";
import { openTicket, getOpenTicketByChannel, closeTicket } from "./service";
import { childLogger } from "../../lib/logger";

const log = childLogger("ticketButtons");

/**
 * Handles button interactions with customId prefix "ticket:".
 * "ticket:open" — posted by /ticket-panel, opens a new private channel + Ticket row.
 * "ticket:close:<ticketId>" — closes the ticket.
 */
export async function handleTicketButton(interaction: ButtonInteraction, client: NexusClient): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This can only be used in a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const [, action, ticketId] = interaction.customId.split(":");

  if (action === "open") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const settings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guild.id } });
    if (settings && !settings.ticketsEnabled) {
      await interaction.editReply("Tickets are currently disabled on this server.");
      return;
    }

    const existing = await prisma.ticket.findFirst({
      where: { guildId: interaction.guild.id, openerId: interaction.user.id, status: { not: "CLOSED" } },
    });
    if (existing) {
      await interaction.editReply(`You already have an open ticket: <#${existing.channelId}>`);
      return;
    }

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`.toLowerCase().slice(0, 90),
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        {
          id: client.user!.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
        },
      ],
    });

    const ticket = await openTicket({
      guildId: interaction.guild.id,
      channelId: channel.id,
      openerId: interaction.user.id,
      openerTag: interaction.user.tag,
      subject: "Support request",
    });

    await channel.send({
      content: `Welcome ${interaction.user}! Support will be with you shortly. (Ticket #${ticket.ticketNumber})`,
    });

    await interaction.editReply(`Your ticket has been created: ${channel}`);
    return;
  }

  if (action === "close") {
    await interaction.deferReply();
    const ticket = ticketId
      ? await prisma.ticket.findUnique({ where: { id: ticketId } })
      : await getOpenTicketByChannel(interaction.channelId);

    if (!ticket) {
      await interaction.editReply("Could not find an open ticket for this channel.");
      return;
    }

    await closeTicket(ticket.guildId, ticket.id, `Closed by ${interaction.user.tag}`);
    await interaction.editReply("This ticket will be archived and closed in 5 seconds.");

    setTimeout(() => {
      interaction.channel?.delete().catch((err) => log.error({ err }, "Failed to delete ticket channel"));
    }, 5000);
  }
}
