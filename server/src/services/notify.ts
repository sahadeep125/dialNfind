import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { mailUser } from "./mail.js";

export type NotificationType = "lead" | "review" | "review_reply" | "claim" | "verification" | "listing" | "subscription" | "sponsored" | "support" | "system";

/**
 * Creates an in-app notification. Never throws: a failed notification must not fail the request
 * that triggered it.
 */
export async function notify(userId: bigint | null | undefined, type: NotificationType, title: string, body: string, data?: Record<string, unknown>) {
  if (!userId) return;
  await prisma.notification
    .create({ data: { userId, type, title, body, dataJson: data ? (data as Prisma.InputJsonValue) : Prisma.JsonNull } })
    .catch(() => undefined);
}

/** For events people should not miss (listing decisions, plan changes, support replies): in-app plus an email. */
export async function notifyAndEmail(
  userId: bigint | null | undefined,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, unknown>,
  action?: { label: string; url: string },
) {
  await Promise.all([notify(userId, type, title, body, data), mailUser(userId, { subject: title, lines: [body], action })]);
}
