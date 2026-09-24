import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import type { Paged, Review } from "@/types";
import { queryKeys } from "./queryKeys";

type ReviewsPage = Paged & { reviews: Review[] };

export function useProviderReviews(
  slug: string,
): UseInfiniteQueryResult<InfiniteData<ReviewsPage>> {
  return useInfiniteQuery({
    queryKey: queryKeys.providerReviews(slug),
    enabled: !!slug,
    initialPageParam: 1,
    queryFn: ({ pageParam }): Promise<ReviewsPage> =>
      api<ReviewsPage>(`/providers/${encodeURIComponent(slug)}/reviews`, {
        query: { page: pageParam, pageSize: 5 },
      }),
    getNextPageParam: (last: ReviewsPage): number | undefined =>
      last.page < last.totalPages ? last.page + 1 : undefined,
  });
}
