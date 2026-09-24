import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { api } from "@/services/api";

interface SaveReviewInput {
  providerId: number;
  reviewId?: number;
  rating: number;
  reviewText: string;
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
    }: SaveReviewInput): Promise<void> => {
      const body = { rating, reviewText: reviewText.trim() };
      if (reviewId) await api(`/reviews/${reviewId}`, { method: "PATCH", body });
      else await api("/reviews", { method: "POST", body: { ...body, providerId } });
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        predicate: (q) =>
          ["my-reviews", "provider", "provider-reviews"].includes(String(q.queryKey[0])),
      });
    },
  });
}
