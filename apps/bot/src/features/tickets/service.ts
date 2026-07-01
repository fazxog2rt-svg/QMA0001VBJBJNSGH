import { prisma, TicketStatus, type Ticket } from "@nexusbot/database";
import { RealtimeEvent } from "@nexusbot/shared";
import { publishRealtimeEvent } from "../../lib/redis";

export interface OpenTicketInput {
  guildId: string;
  channelId: string;
  openerId: string;
  openerTag: string;
  subject: string;
  category?: string;
}

/** Creates a Ticket row with an auto-incrementing per-guild ticketNumber, atomically. */
export async function openTicket(input: OpenTicketInput): Promise<Ticket> {
  const ticket = await prisma.$transaction(async (tx) => {
    const last = await tx.ticket.findFirst({
      where: { guildId: input.guildId },
      orderBy: { ticketNumber: "desc" },
      select: { ticketNumber: true },
    });
    const ticketNumber = (last?.ticketNumber ?? 0) + 1;

    return tx.ticket.create({
      data: {
        guildId: input.guildId,
        ticketNumber,
        channelId: input.channelId,
        openerId: input.openerId,
        openerTag: input.openerTag,
        subject: input.subject,
        category: input.category,
        status: TicketStatus.OPEN,
      },
    });
  });

  await publishRealtimeEvent(RealtimeEvent.TicketOpened, input.guildId, {
    ticketNumber: ticket.ticketNumber,
    channelId: ticket.channelId,
    openerId: ticket.openerId,
    openerTag: ticket.openerTag,
    subject: ticket.subject,
    category: ticket.category,
  });

  return ticket;
}

export async function closeTicket(
  guildId: string,
  ticketId: string,
  closedReason?: string,
): Promise<Ticket> {
  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: TicketStatus.CLOSED, closedAt: new Date(), closedReason: closedReason ?? null },
  });

  await publishRealtimeEvent(RealtimeEvent.TicketClosed, guildId, {
    ticketNumber: ticket.ticketNumber,
    channelId: ticket.channelId,
    closedReason: ticket.closedReason,
  });

  return ticket;
}

export async function addTicketMessage(
  ticketId: string,
  authorTag: string,
  content: string,
  authorId?: string | null,
  isAiReply = false,
): Promise<void> {
  await prisma.ticketMessage.create({
    data: {
      ticketId,
      authorId: authorId ?? null,
      authorTag,
      content,
      isAiReply,
    },
  });
}

export async function getOpenTicketByChannel(channelId: string) {
  return prisma.ticket.findFirst({ where: { channelId, status: { not: TicketStatus.CLOSED } } });
}
