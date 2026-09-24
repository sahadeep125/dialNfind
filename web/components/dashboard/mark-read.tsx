"use client";

import { useEffect } from "react";
import { clientApi } from "@/lib/client";

/** Marks everything read once the list has been seen; the next visit shows them as read. */
export function MarkNotificationsRead() {
  useEffect(() => {
    void clientApi("/me/notifications/read", { method: "POST", body: "{}" }).catch(() => undefined);
  }, []);
  return null;
}
