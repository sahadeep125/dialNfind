import { useMutation } from "@tanstack/react-query";

import { track } from "@/services/analytics";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { OnboardingDraft, OnboardingResponse } from "@/types/onboarding";
import { toPayload } from "@/utils/onboarding";
import { logError } from "@/utils/log";

/**
 * Creates the listing. The onboarding endpoint does not take images, so a chosen logo or cover is
 * saved straight after with a profile update. Resolves to the fresh token when the role changed.
 */
interface CreateListingResult extends OnboardingResponse {
  /** False when the listing was created but the logo or cover could not be saved. */
  imagesSaved: boolean;
}

export function useCreateListing() {
  const setToken = useAuthStore((s) => s.setToken);
  return useMutation<CreateListingResult, Error, OnboardingDraft>({
    mutationFn: async (draft: OnboardingDraft): Promise<CreateListingResult> => {
      const res = await api<OnboardingResponse>("/provider/onboarding", {
        method: "POST",
        body: toPayload(draft),
      });
      // Later requests must carry the provider role, so swap the token before the image update.
      if (res.token) setToken(res.token);
      const { logoUrl, coverUrl } = draft.business;
      let imagesSaved = true;
      if (logoUrl || coverUrl) {
        try {
          await api("/provider/profile", {
            method: "PATCH",
            body: { ...(logoUrl ? { logoUrl } : {}), ...(coverUrl ? { coverUrl } : {}) },
          });
        } catch (error: unknown) {
          // The listing exists; photos can be added again from the profile screen.
          logError("[onboarding] Could not save listing images", error);
          imagesSaved = false;
        }
      }
      return { ...res, imagesSaved };
    },
    onSuccess: (res, draft) =>
      track("onboarding_completed", {
        app: "provider",
        was_customer: res.token !== null,
        service_count: draft.services?.length,
        area_count: draft.areas?.length,
      }),
  });
}
