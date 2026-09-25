import type { Request } from "express";
import type { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { env } from "../env.js";

const isStaff = (role: UserRole) => role === "admin" || role === "super_admin";

/** Records a sign-in and returns its bearer token. Staff sessions are short because the console can change everything. */
export async function startSession(userId: bigint, role: UserRole, req?: Request): Promise<string> {
  const lifetimeMs = isStaff(role) ? env.staffSessionHours * 60 * 60 * 1000 : env.sessionDays * 24 * 60 * 60 * 1000;
  const session = await prisma.authSession.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + lifetimeMs),
      ip: req?.ip ?? null,
      userAgent: req?.get("user-agent")?.slice(0, 300) ?? null,
    },
  });
  return signToken(userId, role, session.id, session.expiresAt);
}

export async function revokeSession(sessionId: string | undefined) {
  if (!sessionId) return;
  await prisma.authSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
}

/** Signs a person out everywhere, optionally keeping the session making the request. */
export async function revokeAllSessions(userId: bigint, exceptSessionId?: string) {
  await prisma.authSession.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date() },
  });
}
