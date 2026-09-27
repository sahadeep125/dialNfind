import { PostHog } from "posthog-node";
import { env } from "../env.js";

/**
 * Product analytics from the API (PostHog). The apps capture what people try to do; the server captures what
 * actually happened (a lead recorded, a subscription paid), which ad blockers and closed apps cannot skip.
 * Events are only sent for signed-in users, whose PostHog distinct id is their account id in every app.
 */
const client = env.posthog.key
  ? new PostHog(env.posthog.key, { host: env.posthog.host, flushAt: 20, flushInterval: 10_000 })
  : null;

type Id = number | bigint | string;

/** Records an event for an account. Does nothing without a key or an account (anonymous visitors). */
export function captureServer(userId: Id | null | undefined, event: string, properties: Record<string, unknown> = {}): void {
  if (!client || userId === null || userId === undefined) return;
  try {
    client.capture({
      distinctId: String(userId),
      event,
      properties: { ...properties, app_type: "backend", platform: "server", environment: env.posthog.environment, source: "server" },
    });
  } catch (err) {
    console.error("[analytics] capture failed", err);
  }
}

/** Sends what is still queued; called on shutdown so the last events are not lost. */
export async function shutdownAnalytics(): Promise<void> {
  await client?.shutdown().catch((err: unknown) => console.error("[analytics] shutdown failed", err));
}
