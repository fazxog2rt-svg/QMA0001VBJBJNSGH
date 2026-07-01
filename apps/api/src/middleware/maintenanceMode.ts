import type { NextFunction, Request, Response } from "express";
import { prisma } from "@nexusbot/database";
import type { ApiErrorBody } from "@nexusbot/shared";
import { verifyAccessToken } from "../lib/jwt";

/**
 * Returns 503 with the configured maintenance message when
 * MaintenanceMode.enabled is true, unless the requester is authenticated as
 * ADMIN/OWNER (so operators can still use the dashboard/API during an
 * outage). Reads the token directly (rather than depending on requireAuth)
 * so it can run early in the middleware chain for all routes, including
 * public ones.
 */
export async function maintenanceModeGate(req: Request, res: Response, next: NextFunction) {
  try {
    const mode = await prisma.maintenanceMode.findUnique({ where: { id: 1 } });
    if (!mode?.enabled) return next();

    const token =
      (req.cookies?.access_token as string | undefined) ??
      req.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (token) {
      try {
        const payload = verifyAccessToken(token);
        if (payload.role === "ADMIN" || payload.role === "OWNER") return next();
      } catch {
        // fall through to maintenance response
      }
    }

    const body: ApiErrorBody = {
      error: {
        code: "MAINTENANCE_MODE",
        message: mode.message ?? "NexusBot is temporarily down for maintenance. Please check back shortly.",
      },
    };
    res.status(503).json(body);
  } catch (err) {
    // If the maintenance-mode check itself fails, fail open rather than
    // taking the whole API down.
    next();
  }
}
