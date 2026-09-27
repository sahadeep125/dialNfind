import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { api, errorMessage } from "@/services/api";
import { track } from "@/services/analytics";
import { useToast } from "./useToast";

export function useDeleteReview(): UseMutationResult<void, Error, number> {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation<void, Error, number>({
    mutationFn: async (id: number): Promise<void> => {
      await api(`/reviews/${id}`, { method: "DELETE" });
    },
    onSuccess: (_data, id) => {
      track("review_deleted", { review_id: id });
      toast("Review deleted", "success");
      void qc.invalidateQueries({
        predicate: (q) =>
          ["my-reviews", "provider", "provider-reviews"].includes(String(q.queryKey[0])),
      });
    },
    onError: (error: Error) => toast(errorMessage(error), "error"),
  });
}
