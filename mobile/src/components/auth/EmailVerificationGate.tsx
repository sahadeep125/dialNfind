import { useEffect } from "react";
import { router, useSegments } from "expo-router";

import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Renders nothing. A signed-in account whose email is not confirmed can only see the code screen,
 * wherever it was opened from (cold start, deep link, a notification).
 */
export function EmailVerificationGate() {
  const mustVerify = useAuthStore((s) => !!s.token && !!s.user && !s.user.emailVerifiedAt);
  const segments = useSegments();
  const onVerifyScreen = segments[0] === "verify-email";

  useEffect(() => {
    if (mustVerify && !onVerifyScreen) router.replace("/verify-email");
  }, [mustVerify, onVerifyScreen]);

  return null;
}
