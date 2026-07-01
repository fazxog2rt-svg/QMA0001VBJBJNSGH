import { Router } from "express";
import { requireAuth, requireGuildStaff } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import * as controller from "./controller";
import { ticketCloseSchema, ticketMessageSchema, ticketsQuerySchema } from "./controller";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /guilds/{id}/tickets:
 *   get:
 *     summary: List tickets for a guild (filterable by status)
 *     tags: [Tickets]
 *     security: [{ cookieAuth: [] }]
 */
router.get(
  "/:id/tickets",
  requireGuildStaff,
  validate({ query: ticketsQuerySchema }),
  asyncHandler(controller.listTickets),
);

/**
 * @openapi
 * /guilds/{id}/tickets/{ticketId}:
 *   get:
 *     summary: Get a ticket with its message history
 *     tags: [Tickets]
 *     security: [{ cookieAuth: [] }]
 */
router.get("/:id/tickets/:ticketId", requireGuildStaff, asyncHandler(controller.getTicket));

/**
 * @openapi
 * /guilds/{id}/tickets/{ticketId}/close:
 *   post:
 *     summary: Close a ticket
 *     tags: [Tickets]
 *     security: [{ cookieAuth: [] }]
 */
router.post(
  "/:id/tickets/:ticketId/close",
  requireGuildStaff,
  validate({ body: ticketCloseSchema }),
  asyncHandler(controller.closeTicket),
);

/**
 * @openapi
 * /guilds/{id}/tickets/{ticketId}/messages:
 *   post:
 *     summary: Post a staff reply message into a ticket
 *     tags: [Tickets]
 *     security: [{ cookieAuth: [] }]
 */
router.post(
  "/:id/tickets/:ticketId/messages",
  requireGuildStaff,
  validate({ body: ticketMessageSchema }),
  asyncHandler(controller.postTicketMessage),
);

export default router;
