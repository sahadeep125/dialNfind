import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { api } from "@/services/api";

export type ReportTarget =
  | { kind: "provider"; slug: string; name: string }
  | { kind: "review"; id: number; name: string };

/** Flags a listing or a review for the DialNFind team to check. Guests can report too. */
export function useReport(): UseMutationResult<unknown, Error, { target: ReportTarget; reason: string }> {
  return useMutation({
    mutationFn: ({ target, reason }: { target: ReportTarget; reason: string }) =>
      api(
        target.kind === "provider"
          ? `/providers/${encodeURIComponent(target.slug)}/report`
          : `/reviews/${target.id}/report`,
        { method: "POST", body: { reason: reason.trim() } },
      ),
  });
}
