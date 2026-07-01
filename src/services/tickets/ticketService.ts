import { ChannelType, PermissionFlagsBits, type Guild, type GuildMember } from "discord.js";
import { GuildConfig } from "../../database/models/GuildConfig";
import { Ticket, type TicketDocument } from "../../database/models/Ticket";
import { getNextSequence } from "../../database/models/Counter";
import { buildEmbed } from "../../utils/embed";
import type { HydratedDocument } from "mongoose";

export interface CreateTicketResult {
  ticket: HydratedDocument<TicketDocument>;
  channelId: string;
}

export async function createTicket(
  guild: Guild,
  opener: GuildMember,
  categoryKey: string,
  categoryLabel: string,
): Promise<CreateTicketResult | { error: string }> {
  const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
  if (!guildConfig?.tickets?.categoryChannelId) {
    return { error: "Sistem tiket belum dikonfigurasi. Hubungi admin server." };
  }

  const existing = await Ticket.findOne({
    guildId: guild.id,
    openedBy: opener.id,
    status: { $in: ["open", "claimed", "reopened"] },
  });
  if (existing) {
    return { error: `Kamu sudah punya tiket terbuka: <#${existing.channelId}>` };
  }

  const ticketNumber = await getNextSequence(`ticket:${guild.id}`);

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: opener.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    ...guildConfig.tickets.supportRoleIds.map((roleId) => ({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    })),
  ];

  const channel = await guild.channels.create({
    name: `tiket-${ticketNumber}`,
    type: ChannelType.GuildText,
    parent: guildConfig.tickets.categoryChannelId,
    permissionOverwrites: overwrites,
    topic: `Tiket #${ticketNumber} • ${categoryLabel} • Dibuka oleh ${opener.user.tag}`,
  });

  const ticket = await Ticket.create({
    guildId: guild.id,
    ticketNumber,
    channelId: channel.id,
    category: categoryKey,
    openedBy: opener.id,
    status: "open",
  });

  return { ticket, channelId: channel.id };
}

export function buildTicketPanelEmbed(guildName: string) {
  return buildEmbed("primary")
    .setTitle("🎫 Pusat Bantuan")
    .setDescription(`Pilih kategori di bawah untuk membuka tiket dengan tim ${guildName}.`);
}

export function buildTicketWelcomeEmbed(ticket: TicketDocument, openerId: string) {
  return buildEmbed("primary")
    .setTitle(`🎫 Tiket #${ticket.ticketNumber}`)
    .setDescription(
      `Halo <@${openerId}>! Tim kami akan segera membantumu. Jelaskan kendalamu secara detail.`,
    )
    .addFields(
      { name: "Kategori", value: ticket.category, inline: true },
      { name: "Status", value: "🟢 Terbuka", inline: true },
    );
}
