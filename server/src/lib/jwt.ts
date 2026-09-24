import jwt, { type SignOptions } from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import { env } from "../env.js";

export interface TokenPayload {
  sub: string;
  role: UserRole;
}

export function signToken(userId: bigint, role: UserRole): string {
  return jwt.sign({ sub: userId.toString(), role } satisfies TokenPayload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === "object" && decoded && "sub" in decoded) return decoded as unknown as TokenPayload;
    return null;
  } catch {
    return null;
  }
}
