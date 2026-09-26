import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import { askAfterReview } from "@/services/reviewPrompt";

interface SaveReviewInput {
  providerId: number;
  reviewId?: number;
  rating: number;
  reviewText: string;
  photos: string[];
}

/** Creates a review, or updates the person's existing one when reviewId is given. */
export function useSaveReview(): UseMutationResult<void, Error, SaveReviewInput> {
  const qc = useQueryClient();
  return useMutation<void, Error, SaveReviewInput>({
    mutationFn: async ({
      providerId,
      reviewId,
      rating,
      reviewText,
      photos,
    }: SaveReviewInput): Promise<void> => {
      const body = { rating, reviewText: reviewText.trim(), photos };
      if (reviewId) await api(`/reviews/${reviewId}`, { method: "PATCH", body });
      else await api("/reviews", { method: "POST", body: { ...body, providerId } });
    },
    onSuccess: (_data, input) => {
      // Only a new review is a moment to ask; editing one is not.
      if (!input.reviewId) void askAfterReview().catch((e: unknown) => console.error("[rating] Prompt failed", e));
      void qc.invalidateQueries({
        predicate: (q) =>
          ["my-reviews", "provider", "provider-reviews"].includes(String(q.queryKey[0])),
      });
    },
  });
}
