import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@nexusbot/database";
import { RealtimeEvent, REDIS_EVENTS_CHANNEL, type RealtimeEnvelope } from "@nexusbot/shared";
import { ApiError } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../middleware/auditLog";
import { redisPublisher } from "../../lib/redis";
import { paginate, paginationQuerySchema, skipTake } from "../../lib/pagination";

export const ticketsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["OPEN", "PENDING", "CLOSED"]).optional(),
});

export async function listTickets(req: Request, res: Response) {
  const guildId = req.params.id;
  const query = ticketsQuerySchema.parse(req.query);

  const where = { guildId, ...(query.status ? { status: query.status } : {}) };
  const [items, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { assignee: { select: { id: true, username: true, avatarUrl: true } } },
      ...skipTake(query),
    }),
    prisma.ticket.count({ where }),
  ]);

  res.status(200).json(paginate(items, total, query));
}

export async function getTicket(req: Request, res: Response) {
  const { id: guildId, ticketId } = req.params;
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      assignee: { select: { id: true, username: true, avatarUrl: true } },
    },
  });
  if (!ticket || ticket.guildId !== guildId) throw ApiError.notFound("Ticket not found");
  res.status(200).json({ ticket });
}

export const ticketCloseSchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function closeTicket(req: Request, res: Response) {
  const { id: guildId, ticketId } = req.params;
  const { reason } = ticketCloseSchema.parse(req.body);

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.guildId !== guildId) throw ApiError.notFound("Ticket not found");
  if (ticket.status === "CLOSED") throw ApiError.conflict("Ticket is already closed");

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: "CLOSED", closedAt: new Date(), closedReason: reason },
  });

  await writeAuditLog({
    guildId,
    actorId: req.user!.sub,
    action: "ticket.close",
    target: ticketId,
    metadata: { reason },
    req,
  });

  const envelope: RealtimeEnvelope = {
    event: RealtimeEvent.TicketClosed,
    guildId,
    timestamp: new Date().toISOString(),
    data: updated,
  };
  await redisPublisher.publish(REDIS_EVENTS_CHANNEL, JSON.stringify(envelope));

  res.status(200).json({ ticket: updated });
}

export const ticketMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

export async function postTicketMessage(req: Request, res: Response) {
  const { id: guildId, ticketId } = req.params;
  const { content } = ticketMessageSchema.parse(req.body);

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.guildId !== guildId) throw ApiError.notFound("Ticket not found");
  if (ticket.status === "CLOSED") throw ApiError.conflict("Cannot message a closed ticket");

  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });

  const message = await prisma.ticketMessage.create({
    data: {
      ticketId,
      authorId: req.user!.sub,
      authorTag: user?.username ?? req.user!.sub,
      content,
    },
  });

  const envelope: RealtimeEnvelope = {
    event: RealtimeEvent.TicketMessage,
    guildId,
    timestamp: new Date().toISOString(),
    data: message,
  };
  await redisPublisher.publish(REDIS_EVENTS_CHANNEL, JSON.stringify(envelope));

  res.status(201).json({ message });
}
