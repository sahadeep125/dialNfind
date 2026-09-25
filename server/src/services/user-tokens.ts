import { createHash, randomBytes } from "node:crypto";
import type { UserTokenType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const LIFETIME_MS: Record<UserTokenType, number> = {
  verify_email: 3 * 24 * 60 * 60 * 1000,
  reset_password: 60 * 60 * 1000,
};

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Issues a single-use token for an email link. Older unused tokens of the same type stop working. Only the hash is stored. */
export async function issueUserToken(userId: bigint, type: UserTokenType): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.userToken.deleteMany({ where: { userId, type, usedAt: null } }),
    prisma.userToken.create({ data: { userId, type, tokenHash: hash(token), expiresAt: new Date(Date.now() + LIFETIME_MS[type]) } }),
  ]);
  return token;
}

/** Marks the token used and returns its user, or null when it is unknown, used or expired. */
export async function consumeUserToken(token: string, type: UserTokenType): Promise<bigint | null> {
  const row = await prisma.userToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) return null;
  const { count } = await prisma.userToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  return count ? row.userId : null;
}
