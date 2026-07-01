import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import type { ApiErrorBody } from "@nexusbot/shared";
import { isProduction } from "../config/env";
import { childLogger } from "../lib/logger";

const log = childLogger("http");

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = "Bad request", details?: unknown) {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }
  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }
  static forbidden(message = "Forbidden") {
    return new ApiError(403, "FORBIDDEN", message);
  }
  static notFound(message = "Not found") {
    return new ApiError(404, "NOT_FOUND", message);
  }
  static conflict(message = "Conflict") {
    return new ApiError(409, "CONFLICT", message);
  }
  static tooManyRequests(message = "Too many requests") {
    return new ApiError(429, "TOO_MANY_REQUESTS", message);
  }
  static internal(message = "Internal server error") {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }
}

export function notFoundHandler(req: Request, res: Response) {
  const body: ApiErrorBody = {
    error: { code: "NOT_FOUND", message: `No route matching ${req.method} ${req.path}` },
  };
  res.status(404).json(body);
}

/**
 * Central error handler. Always responds with the ApiErrorBody JSON shape —
 * never renders user-supplied input as HTML, and never leaks stack traces
 * (or other internals) outside of development, preventing reflected-content
 * and information-disclosure issues in error responses.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const body: ApiErrorBody = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      },
    };
    res.status(400).json(body);
    return;
  }

  if (err instanceof ApiError) {
    const body: ApiErrorBody = {
      error: { code: err.code, message: err.message, details: err.details },
    };
    res.status(err.status).json(body);
    return;
  }

  log.error({ err, path: req.path, method: req.method }, "Unhandled error");

  const body: ApiErrorBody = {
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again later.",
      details: isProduction ? undefined : String(err instanceof Error ? err.stack ?? err.message : err),
    },
  };
  res.status(500).json(body);
}
