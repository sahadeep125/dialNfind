import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import { env } from "../env.js";

export interface TokenPayload {
  sub: string;
  role: UserRole;
  /** The auth_sessions row this token belongs to. */
  sid: string;
}

export function signToken(userId: bigint, role: UserRole, sessionId: string, expiresAt: Date): string {
  return jwt.sign({ sub: userId.toString(), role, sid: sessionId } satisfies TokenPayload, env.jwtSecret, {
    expiresIn: Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === "object" && decoded && "sub" in decoded && "sid" in decoded) return decoded as unknown as TokenPayload;
    return null;
  } catch {
    return null;
  }
}

const PREVIEW_AUDIENCE = "provider-preview";
const PREVIEW_MINUTES = 30;

/**
 * A short-lived link token that shows one listing on the website before it is live (pending, rejected or
 * suspended). It carries no session, so it cannot sign anyone in (verifyToken rejects it: no `sid`).
 */
export function signPreviewToken(providerId: bigint): string {
  return jwt.sign({ pid: providerId.toString() }, env.jwtSecret, { audience: PREVIEW_AUDIENCE, expiresIn: PREVIEW_MINUTES * 60 });
}

/** The provider id a preview token is for, or null when it is invalid or expired. */
export function verifyPreviewToken(token: string): bigint | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret, { audience: PREVIEW_AUDIENCE });
    if (typeof decoded === "object" && decoded && typeof decoded.pid === "string" && /^\d+$/.test(decoded.pid)) return BigInt(decoded.pid);
    return null;
  } catch {
    return null;
  }
}
