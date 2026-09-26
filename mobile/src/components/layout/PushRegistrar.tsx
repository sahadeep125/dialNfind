import { useEffect, useRef } from "react";
import { router, type Href } from "expo-router";
import * as Notifications from "expo-notifications";
import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/hooks/queryKeys";
import { notificationKeys } from "@/hooks/useNotifications";
import { supportKeys } from "@/hooks/useSupport";
import { pushOptedOut, registerForPush } from "@/services/push";
import { useAuthStore } from "@/stores/useAuthStore";

type PushData = { type?: string; reviewId?: number; ticketId?: number; providerSlug?: string };

/** Where tapping an alert takes the person. */
export function routeForNotification(data: PushData): Href {
  if (data.ticketId) return { pathname: "/support/[id]", params: { id: String(data.ticketId) } };
  if (data.type === "review_reply" && data.providerSlug)
    return { pathname: "/provider/[slug]", params: { slug: data.providerSlug } };
  if (data.type === "review_reply") return "/(tabs)/reviews";
  return "/notifications";
}

/** Queries an alert makes stale, so open screens refresh when it arrives. */
function staleKeys(data: PushData): readonly unknown[][] {
  const keys: unknown[][] = [[...notificationKeys.all]];
  if (data.ticketId || data.type === "support") keys.push([...supportKeys.all]);
  if (data.type === "review_reply") keys.push([...queryKeys.myReviews]);
  if (data.providerSlug) keys.push([...queryKeys.providerReviews(data.providerSlug)]);
  return keys;
}

/**
 * Renders nothing. Once someone is signed in, registers this device for push alerts (unless they
 * turned them off in Settings), opens the right screen when an alert is tapped, and refreshes data
 * when one arrives while the app is open.
 */
export function PushRegistrar() {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const registeredFor = useRef<string | null>(null);
  const handled = useRef<string | null>(null);
  const last = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!token || registeredFor.current === token || pushOptedOut()) return;
    registeredFor.current = token;
    registerForPush({ ask: true }).catch((error: unknown) => console.error("[push] Registration failed", error));
  }, [token]);

  useEffect(() => {
    if (!last || !token || last.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = last.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    router.push(routeForNotification(last.notification.request.content.data as PushData));
  }, [last, token]);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((n) => {
      for (const key of staleKeys(n.request.content.data as PushData)) void qc.invalidateQueries({ queryKey: key });
    });
    return () => sub.remove();
  }, [qc]);

  return null;
}
