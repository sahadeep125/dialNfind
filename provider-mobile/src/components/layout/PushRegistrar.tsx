import { useEffect, useRef } from "react";
import { router, type Href } from "expo-router";
import * as Notifications from "expo-notifications";
import { useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/hooks/useSession";
import { pushOptedOut, registerForPush } from "@/services/push";
import { useAuthStore } from "@/stores/useAuthStore";

type PushData = { type?: string; leadId?: number; reviewId?: number; ticketId?: number; campaignId?: number };

/** Where tapping an alert takes the person. */
function routeFor(data: PushData): Href {
  if (data.leadId || data.type === "lead") return "/(tabs)/leads";
  if (data.reviewId || data.type === "review") return "/(tabs)/reviews";
  if (data.ticketId) return { pathname: "/support/[id]", params: { id: String(data.ticketId) } };
  if (data.campaignId || data.type === "sponsored") return "/promote";
  if (data.type === "subscription") return "/subscription";
  return "/notifications";
}

/** Query prefixes an alert makes stale, so open screens refresh when it arrives. */
function staleKeys(data: PushData): string[] {
  const keys = ["notifications"];
  if (data.leadId || data.type === "lead") keys.push("leads", "dashboard");
  if (data.reviewId || data.type === "review") keys.push("reviews", "dashboard");
  if (data.ticketId || data.type === "support") keys.push("support");
  if (data.type === "subscription") keys.push("billing", "session");
  if (data.type === "sponsored") keys.push("sponsored");
  if (data.type === "listing" || data.type === "verification" || data.type === "claim") keys.push("session", "profile");
  return keys;
}

/**
 * Renders nothing. Once a business is signed in, registers this device for push alerts (unless the
 * person turned them off), opens the right screen when an alert is tapped, and refreshes data when
 * one arrives while the app is open.
 */
export function PushRegistrar() {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const session = useSession();
  const hasBusiness = !!session.data?.state.provider;
  const registeredFor = useRef<string | null>(null);
  const handled = useRef<string | null>(null);
  const last = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!token || !hasBusiness || registeredFor.current === token || pushOptedOut()) return;
    registeredFor.current = token;
    registerForPush({ ask: true }).catch((error: unknown) => console.error("[push] Registration failed", error));
  }, [token, hasBusiness]);

  useEffect(() => {
    if (!last || !token || last.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = last.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    router.push(routeFor(last.notification.request.content.data as PushData));
  }, [last, token]);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((n) => {
      for (const key of staleKeys(n.request.content.data as PushData)) void qc.invalidateQueries({ queryKey: [key] });
    });
    return () => sub.remove();
  }, [qc]);

  return null;
}
