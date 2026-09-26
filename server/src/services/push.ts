import { prisma } from "../lib/prisma.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** Expo accepts up to 100 messages per request. */
const BATCH = 100;

interface ExpoTicket {
  status: "ok" | "error";
  details?: { error?: string };
}

/**
 * Sends a push notification to every device the person is signed in on (the customer and business apps register
 * them). Never throws: a failed push must not fail the request that caused it. Tokens Expo reports as
 * no longer registered (app uninstalled) are removed.
 */
export async function sendPush(userId: bigint, title: string, body: string, data?: Record<string, unknown>): Promise<void> {
  try {
    const tokens = await prisma.pushToken.findMany({ where: { userId }, select: { token: true } });
    for (let i = 0; i < tokens.length; i += BATCH) {
      const batch = tokens.slice(i, i + BATCH);
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify(
          batch.map(({ token }) => ({ to: token, title, body, data: data ?? {}, sound: "default", channelId: "alerts", priority: "high" })),
        ),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        console.error(`[push] Expo answered ${res.status}`);
        continue;
      }
      const { data: tickets } = (await res.json()) as { data?: ExpoTicket[] };
      const gone = (tickets ?? []).flatMap((t, j) => (t.status === "error" && t.details?.error === "DeviceNotRegistered" ? [batch[j]!.token] : []));
      if (gone.length) await prisma.pushToken.deleteMany({ where: { token: { in: gone } } });
    }
  } catch (err: unknown) {
    console.error("[push] send failed", err);
  }
}
