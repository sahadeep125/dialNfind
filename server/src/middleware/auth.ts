import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { verifyToken } from "../lib/jwt.js";
import { forbidden, unauthorized } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

export interface AuthUser {
  id: bigint;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function bearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

/** Attaches req.user when a valid token is present; never rejects. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = bearer(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      const user = await prisma.user.findUnique({ where: { id: BigInt(payload.sub) }, select: { id: true, role: true, status: true } });
      if (user && user.status === "active") req.user = { id: user.id, role: user.role };
    }
  }
  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  await optionalAuth(req, res, () => undefined);
  if (!req.user) throw unauthorized();
  next();
}

export function requireRole(...roles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    await optionalAuth(req, res, () => undefined);
    if (!req.user) throw unauthorized();
    if (!roles.includes(req.user.role)) throw forbidden();
    next();
  };
}

export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
