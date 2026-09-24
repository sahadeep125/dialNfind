import { useCallback } from "react";

import { api, errorMessage } from "@/services/api";
import { openPhone, openWhatsApp } from "@/services/links";
import type { ProviderCard } from "@/types";
import { useToast } from "./useToast";

type Channel = "call" | "whatsapp";
type Source = "search" | "category_browse" | "profile";

/** Records the lead (guests too, like the website) and then opens the dialer or WhatsApp. */
export function useContactProvider(): (
  provider: Pick<ProviderCard, "id" | "businessName" | "phone" | "whatsappNumber">,
  channel: Channel,
  source?: Source,
) => Promise<void> {
  const toast = useToast();
  return useCallback(
    async (
      provider: Pick<ProviderCard, "id" | "businessName" | "phone" | "whatsappNumber">,
      channel: Channel,
      source: Source = "profile",
    ): Promise<void> => {
      let number = channel === "call" ? provider.phone : provider.whatsappNumber || provider.phone;
      try {
        const res = await api<{ contact: { number: string } }>("/leads", {
          method: "POST",
          body: { providerId: provider.id, channel, source },
        });
        number = res.contact.number || number;
      } catch (error: unknown) {
        // Counting the lead should never stop someone from reaching the provider.
        console.error("[leads] Could not record lead", error);
      }
      try {
        if (channel === "call") await openPhone(number);
        else await openWhatsApp(number, `Hi ${provider.businessName}, I found you on DialNFind.`);
      } catch (error: unknown) {
        toast(
          channel === "call"
            ? "Calling is not available on this device"
            : `Could not open WhatsApp. ${errorMessage(error)}`,
          "error",
        );
      }
    },
    [toast],
  );
}
