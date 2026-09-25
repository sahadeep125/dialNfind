import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { verifyToken } from "../lib/jwt.js";
import { forbidden, unauthorized } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

export interface AuthUser {
  id: bigint;
  role: UserRole;
  /** The sign-in this request belongs to, so /auth/logout can end just this one. */
  sessionId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    if (payload && UUID.test(payload.sid)) {
      // One lookup checks both the sign-in (not revoked or expired) and the account (still active).
      const session = await prisma.authSession.findUnique({
        where: { id: payload.sid },
        select: { userId: true, expiresAt: true, revokedAt: true, user: { select: { id: true, role: true, status: true } } },
      });
      const valid = session && !session.revokedAt && session.expiresAt > new Date() && session.userId.toString() === payload.sub;
      if (valid && session.user.status === "active") req.user = { id: session.user.id, role: session.user.role, sessionId: payload.sid };
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
