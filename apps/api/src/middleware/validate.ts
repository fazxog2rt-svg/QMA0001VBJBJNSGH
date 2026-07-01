import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

interface ValidateSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates req.body/query/params against zod schemas and replaces them with
 * the parsed (and coerced/defaulted) values. Throws ZodError on failure,
 * which errorHandler.ts converts into a 400 ApiErrorBody — routes should
 * never read raw, unvalidated req.body for mutating operations.
 */
export function validate(schemas: ValidateSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as typeof req.query;
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
