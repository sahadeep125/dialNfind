import { useEffect, useRef } from "react";
import { router, useSegments } from "expo-router";

import { STORAGE_KEYS, storage } from "@/services/storage";

export const hasOnboarded = (): boolean => storage.getString(STORAGE_KEYS.onboarded) === "1";

export const markOnboarded = (): void => storage.set(STORAGE_KEYS.onboarded, "1");

/**
 * Renders nothing. On the very first launch, sends the person to the introduction, but only when the
 * app opened on Home: a deep link to a provider or a notification goes straight to where it points.
 * Runs behind the branded splash, so the switch is never seen.
 */
export function OnboardingGate() {
  const segments = useSegments();
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    const [first, second] = segments as string[];
    const onHome =
      first === undefined || (first === "(tabs)" && (second === undefined || second === "index"));
    if (!hasOnboarded() && onHome) router.replace("/onboarding");
  }, [segments]);

  return null;
}
