import { useEffect } from "react";
import { AppState } from "react-native";

import { askIfPending } from "@/services/reviewPrompt";

/** Renders nothing. When the app returns from a call or WhatsApp, shows the store rating prompt if it is due. */
export function RatingPrompter() {
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void askIfPending().catch((e: unknown) => console.error("[rating] Prompt failed", e));
    });
    return () => sub.remove();
  }, []);
  return null;
}
