import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { HttpError } from "../lib/errors.js";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: "not_found", message: `No route for ${req.method} ${req.path}` } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ error: { code: "conflict", message: "A record with these details already exists" } });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: { code: "not_found", message: "Record not found" } });
      return;
    }
  }
  if (err && typeof err === "object" && "type" in err && (err as { type: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: { code: "bad_request", message: "Malformed JSON body" } });
    return;
  }
  if (err && typeof err === "object" && "type" in err && (err as { type: string }).type === "entity.too.large") {
    res.status(413).json({ error: { code: "payload_too_large", message: "The file or request is too large" } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "internal", message: "Something went wrong" } });
}
