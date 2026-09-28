import type { MouseEvent } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "./api";
import { WEB_URL } from "./config";

export const publicProfileUrl = (slug: string) => `${WEB_URL}/providers/${slug}`;

/**
 * Click handler for "View public profile" links. A live listing opens its public page (the link's own href);
 * one that is not live yet has no public page, so this opens a short-lived preview link instead.
 */
export function previewIfNotLive(status: string | undefined) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (status === "active") return;
    event.preventDefault();
    // Opened before the request so the browser does not treat it as an unrequested popup.
    const tab = window.open("", "_blank");
    api<{ url: string }>("/provider/preview-link")
      .then(({ url }) => {
        if (tab) {
          tab.opener = null;
          tab.location.href = url;
        } else window.location.href = url;
      })
      .catch((err: unknown) => {
        tab?.close();
        toast.error(errorMessage(err));
      });
  };
}
