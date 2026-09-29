import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import { getDeviceId } from "@/services/device";
import { track } from "@/services/analytics";
import { askAfterReview } from "@/services/reviewPrompt";
import type { OwnReview } from "@/types";
import { logError } from "@/utils/log";

interface SaveReviewInput {
  providerId: number;
  reviewId?: number;
  rating: number;
  reviewText: string;
  photos: string[];
}

/**
 * Creates a review, or updates the person's existing one when reviewId is given. Resolves with the saved
 * review, whose status is "pending" when the DialNFind team checks it before it shows.
 */
export function useSaveReview(): UseMutationResult<OwnReview, Error, SaveReviewInput> {
  const qc = useQueryClient();
  return useMutation<OwnReview, Error, SaveReviewInput>({
    mutationFn: async ({
      providerId,
      reviewId,
      rating,
      reviewText,
      photos,
    }: SaveReviewInput): Promise<OwnReview> => {
      const body = { rating, reviewText: reviewText.trim(), photos };
      if (reviewId) {
        return (await api<{ review: OwnReview }>(`/reviews/${reviewId}`, { method: "PATCH", body }))
          .review;
      }
      const deviceId = (await getDeviceId()) ?? undefined;
      return (
        await api<{ review: OwnReview }>("/reviews", {
          method: "POST",
          body: { ...body, providerId, deviceId },
        })
      ).review;
    },
    onSuccess: (_data, input) => {
      track(input.reviewId ? "review_updated" : "review_submitted", {
        provider_id: input.providerId,
        rating: input.rating,
        photo_count: input.photos?.length ?? 0,
      });
      // Only a new review is a moment to ask; editing one is not.
      if (!input.reviewId)
        void askAfterReview().catch((e: unknown) => logError("[rating] Prompt failed", e));
      void qc.invalidateQueries({
        predicate: (q) =>
          ["my-reviews", "provider", "provider-reviews"].includes(String(q.queryKey[0])),
      });
    },
  });
}
