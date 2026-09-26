import { Prisma } from "@prisma/client";
import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";
import { mailUser } from "./mail.js";
import { sendPush } from "./push.js";

export type NotificationType = "lead" | "review" | "review_reply" | "claim" | "verification" | "listing" | "subscription" | "sponsored" | "support" | "system";

const MINUTE = 60 * 1000;
/** A burst of leads becomes one push: after a lead push, the next one waits this long. */
const LEAD_BUNDLE_MS = 5 * MINUTE;
/** Pushes a person can get in a day apart from leads; the rest stay in the in-app list. */
const DAILY_PUSH_CAP = 10;
/** Nothing here needs someone's attention at night; it waits in the in-app list instead. */
const QUIET_TYPES = new Set<NotificationType>(["review", "review_reply", "sponsored", "subscription"]);
const QUIET_FROM_HOUR = 22;
const QUIET_UNTIL_HOUR = 8;

const pushed = { dataJson: { path: ["pushed"], equals: true } } satisfies Prisma.NotificationWhereInput;

function inQuietHours(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: env.timezone }).format(now));
  return hour >= QUIET_FROM_HOUR || hour < QUIET_UNTIL_HOUR;
}

/** Whether this notification should also go out as a push, and with what text. Every notification is saved in-app regardless. */
async function pushPolicy(userId: bigint, notificationId: bigint, type: NotificationType, title: string, body: string) {
  const now = Date.now();
  if (type === "lead") {
    const lastPush = await prisma.notification.findFirst({
      where: { userId, type, id: { not: notificationId }, ...pushed },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (lastPush && now - lastPush.createdAt.getTime() < LEAD_BUNDLE_MS) return null;
    const waiting = await prisma.notification.count({
      where: { userId, type, id: { not: notificationId }, createdAt: { gt: lastPush?.createdAt ?? new Date(now - LEAD_BUNDLE_MS) } },
    });
    return waiting ? { title: `${waiting + 1} new enquiries`, body: "Customers contacted you in the last few minutes. Open DialNFind to see them." } : { title, body };
  }
  if (QUIET_TYPES.has(type) && inQuietHours()) return null;
  const today = await prisma.notification.count({
    where: { userId, type: { not: "lead" }, createdAt: { gt: new Date(now - 24 * 60 * MINUTE) }, ...pushed },
  });
  return today >= DAILY_PUSH_CAP ? null : { title, body };
}

/**
 * Creates an in-app notification and, when the push rules allow, pushes it to the person's signed-in
 * devices. Never throws: a failed notification must not fail the request that triggered it.
 */
export async function notify(userId: bigint | null | undefined, type: NotificationType, title: string, body: string, data?: Record<string, unknown>) {
  if (!userId) return;
  try {
    const saved = await prisma.notification.create({
      data: { userId, type, title, body, dataJson: data ? (data as Prisma.InputJsonValue) : Prisma.JsonNull },
    });
    const push = await pushPolicy(userId, saved.id, type, title, body);
    if (!push) return;
    await prisma.notification.update({ where: { id: saved.id }, data: { dataJson: { ...data, pushed: true } as Prisma.InputJsonValue } });
    void sendPush(userId, push.title, push.body, { ...data, type, notificationId: Number(saved.id) });
  } catch (err) {
    console.error("[notify] failed", err);
  }
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
