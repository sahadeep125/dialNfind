import type { QueryClient } from "@tanstack/react-query";

import type { ProviderProfile } from "@/types";
import { queryKeys } from "./queryKeys";

/** Query keys owned by the listing screens (profile, services, hours, areas, portfolio, verification). */
export const listingKeys = {
  attributes: ["listing", "attributes"] as const,
  verifications: ["listing", "verifications"] as const,
};

/**
 * After any listing write: store the fresh profile when the server sent one, then refetch the
 * profile (completeness and checklist change) and the session (business name and status).
 */
export async function refreshListing(qc: QueryClient, provider?: ProviderProfile): Promise<void> {
  if (provider) qc.setQueryData(queryKeys.profile, provider);
  await Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.profile }),
    qc.invalidateQueries({ queryKey: ["session"] }),
  ]);
}
