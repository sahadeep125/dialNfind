import { useEffect, useRef } from "react";
import { useGlobalSearchParams, usePathname } from "expo-router";

import { identifyUser, resetUser, trackScreen } from "@/services/analytics";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLocationStore } from "@/stores/useLocationStore";

/**
 * Renders nothing. Records a screen view for each Expo Router path, identifies the signed-in account
 * (again when the name, email or role changes) and resets analytics when the person signs out.
 */
export function AnalyticsSync() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const paramsKey = JSON.stringify(params);
  useEffect(() => {
    trackScreen(pathname, JSON.parse(paramsKey) as Record<string, string | string[] | undefined>);
  }, [pathname, paramsKey]);

  const user = useAuthStore((s) => s.user);
  const identified = useRef<string | null>(null);
  useEffect(() => {
    const key = user ? `${user.id}:${user.role}:${user.name}:${user.email}:${user.provider?.id ?? ""}` : null;
    if (key === identified.current) return;
    if (user) identifyUser(user);
    else if (identified.current !== null) resetUser(useLocationStore.getState().location.city);
    identified.current = key;
  }, [user]);

  return null;
}
