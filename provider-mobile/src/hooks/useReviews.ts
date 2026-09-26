import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import type { ReviewFilter, ReviewsPage } from "@/types/reviews";
import { dashboardKeys } from "./useDashboard";

const PAGE_SIZE = 10;

export const reviewKeys = {
  all: ["reviews"] as const,
  list: (filter: ReviewFilter) => ["reviews", filter] as const,
};

/** Reviews of the business, newest first, loaded 10 at a time. Every page carries the rating summary. */
export function useReviews(
  filter: ReviewFilter,
): UseInfiniteQueryResult<InfiniteData<ReviewsPage>> {
  return useInfiniteQuery({
    queryKey: reviewKeys.list(filter),
    initialPageParam: 1,
    queryFn: ({ pageParam }): Promise<ReviewsPage> =>
      api<ReviewsPage>("/provider/reviews", {
        query: { filter, page: pageParam, pageSize: PAGE_SIZE },
      }),
    getNextPageParam: (last: ReviewsPage): number | undefined =>
      last.page < last.totalPages ? last.page + 1 : undefined,
  });
}

interface ReplyInput {
  reviewId: number;
  /** null removes the reply. */
  reply: string | null;
}

/** Publishes, edits or removes the business's public reply to a review. */
export function useReplyToReview(): UseMutationResult<unknown, Error, ReplyInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, reply }: ReplyInput) =>
      api(`/provider/reviews/${reviewId}/reply`, { method: "PUT", body: { reply } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

/** Flags a fake or abusive review for the moderation team. */
export function useReportReview(): UseMutationResult<unknown, Error, { reviewId: number; reason: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, reason }: { reviewId: number; reason: string }) =>
      api(`/provider/reviews/${reviewId}/report`, { method: "POST", body: { reason } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewKeys.all });
    },
  });
}
