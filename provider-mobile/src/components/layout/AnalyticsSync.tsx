import { useEffect, useRef } from "react";
import { useGlobalSearchParams, usePathname } from "expo-router";

import { useSession } from "@/hooks/useSession";
import { identifyUser, resetUser, trackScreen } from "@/services/analytics";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Renders nothing. Records a screen view for each Expo Router path, identifies the signed-in account
 * (again when the role flips to provider after onboarding or a claim, or the plan changes) and resets
 * analytics when the person signs out.
 */
export function AnalyticsSync() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const paramsKey = JSON.stringify(params);
  useEffect(() => {
    trackScreen(pathname, JSON.parse(paramsKey) as Record<string, string | string[] | undefined>);
  }, [pathname, paramsKey]);

  const user = useAuthStore((s) => s.user);
  const plan = useSession().data?.state.plan?.plan.code ?? null;
  const identified = useRef<string | null>(null);
  useEffect(() => {
    const key = user ? `${user.id}:${user.role}:${user.name}:${user.email}:${user.provider?.id ?? ""}:${plan ?? ""}` : null;
    if (key === identified.current) return;
    if (user) identifyUser(user, plan);
    else if (identified.current !== null) resetUser();
    identified.current = key;
  }, [user, plan]);

  return null;
}
