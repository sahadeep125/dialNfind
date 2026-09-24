import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { MyReview } from "@/types";
import { queryKeys } from "./queryKeys";

export function useMyReviews(): UseQueryResult<MyReview[]> {
  const signedIn = useAuthStore((s) => !!s.token);
  return useQuery({
    queryKey: queryKeys.myReviews,
    enabled: signedIn,
    queryFn: async (): Promise<MyReview[]> =>
      (await api<{ reviews: MyReview[] }>("/me/reviews")).reviews,
  });
}
