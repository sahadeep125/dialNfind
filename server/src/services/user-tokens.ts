import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { UserTokenType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const HOUR = 60 * 60 * 1000;

const LIFETIME_MS: Record<UserTokenType, number> = {
  verify_email: 24 * HOUR,
  verify_email_code: HOUR / 2,
  reset_password: HOUR,
};

/** Wrong guesses allowed on one code before a new one must be requested. */
const MAX_CODE_ATTEMPTS = 5;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
// Codes are short, so the user id is part of the hash to keep hashes unique across accounts.
const codeHash = (userId: bigint, code: string) => hash(`${userId}:${code}`);

/** Issues a single-use token for an email link. Older unused tokens of the same type stop working. Only the hash is stored. */
export async function issueUserToken(userId: bigint, type: Exclude<UserTokenType, "verify_email_code">, lifetimeMs = LIFETIME_MS[type]): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.userToken.deleteMany({ where: { userId, type, usedAt: null } }),
    prisma.userToken.create({ data: { userId, type, tokenHash: hash(token), expiresAt: new Date(Date.now() + lifetimeMs) } }),
  ]);
  return token;
}

/** Marks the token used and returns its user, or null when it is unknown, used or expired. */
export async function consumeUserToken(token: string, type: Exclude<UserTokenType, "verify_email_code">): Promise<bigint | null> {
  const row = await prisma.userToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) return null;
  const { count } = await prisma.userToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  return count ? row.userId : null;
}

/** Issues a 6-digit email confirmation code; the previous one stops working. */
export async function issueVerifyCode(userId: bigint): Promise<string> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const type = "verify_email_code" as const;
  await prisma.$transaction([
    prisma.userToken.deleteMany({ where: { userId, type, usedAt: null } }),
    prisma.userToken.create({ data: { userId, type, tokenHash: codeHash(userId, code), expiresAt: new Date(Date.now() + LIFETIME_MS[type]) } }),
  ]);
  return code;
}

export type CodeResult = "ok" | "wrong" | "expired";

/** Checks a typed code against the person's live one. Every wrong guess counts; after a few the code is dead. */
export async function consumeVerifyCode(userId: bigint, code: string): Promise<CodeResult> {
  const row = await prisma.userToken.findFirst({
    where: { userId, type: "verify_email_code", usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!row || row.expiresAt < new Date() || row.attempts >= MAX_CODE_ATTEMPTS) return "expired";
  const matches = timingSafeEqual(Buffer.from(row.tokenHash), Buffer.from(codeHash(userId, code)));
  if (!matches) {
    await prisma.userToken.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return row.attempts + 1 >= MAX_CODE_ATTEMPTS ? "expired" : "wrong";
  }
  const { count } = await prisma.userToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  return count ? "ok" : "expired";
}

/** When the person's latest confirmation code was sent, for the resend cooldown. */
export async function lastVerifyCodeSentAt(userId: bigint): Promise<Date | null> {
  const row = await prisma.userToken.findFirst({
    where: { userId, type: "verify_email_code" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return row?.createdAt ?? null;
}
