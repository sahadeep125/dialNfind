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
