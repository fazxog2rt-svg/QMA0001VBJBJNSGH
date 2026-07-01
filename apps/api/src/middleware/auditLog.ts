import type { Request } from "express";
import { prisma } from "@nexusbot/database";
import { childLogger } from "../lib/logger";

const log = childLogger("audit-log");

export interface AuditLogInput {
  guildId?: string | null;
  actorId?: string | null;
  actorTag?: string | null;
  action: string;
  target?: string | null;
  metadata?: Record<string, unknown>;
  req?: Request;
}

/**
 * Writes a row to AuditLog. Call this from route handlers after any
 * meaningful mutation (admin actions, moderation actions, settings changes).
 * Never throws — audit logging failures must not break the primary request.
 */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        guildId: input.guildId ?? null,
        actorId: input.actorId ?? null,
        actorTag: input.actorTag ?? null,
        action: input.action,
        target: input.target ?? null,
        metadata: (input.metadata ?? {}) as object,
        ipAddress: input.req?.ip ?? null,
      },
    });
  } catch (err) {
    log.error({ err, action: input.action }, "Failed to write audit log");
  }
}
