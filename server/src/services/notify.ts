import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export type NotificationType = "lead" | "review" | "review_reply" | "claim" | "verification" | "listing" | "subscription" | "sponsored" | "support" | "system";

/**
 * Creates an in-app notification. Never throws: a failed notification must not fail the request
 * that triggered it. Push delivery to device_tokens plugs in here once a push provider is configured.
 */
export async function notify(userId: bigint | null | undefined, type: NotificationType, title: string, body: string, data?: Record<string, unknown>) {
  if (!userId) return;
  await prisma.notification
    .create({ data: { userId, type, title, body, dataJson: data ? (data as Prisma.InputJsonValue) : Prisma.JsonNull } })
    .catch(() => undefined);
}
