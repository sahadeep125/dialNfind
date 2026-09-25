import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import type { LeadFilter, LeadsPage } from "@/types/leads";

const PAGE_SIZE = 15;

export const leadKeys = {
  all: ["leads"] as const,
  list: (channel: LeadFilter) => ["leads", channel] as const,
};

/** Leads newest first, loaded 15 at a time, optionally for one channel. */
export function useLeads(channel: LeadFilter): UseInfiniteQueryResult<InfiniteData<LeadsPage>> {
  return useInfiniteQuery({
    queryKey: leadKeys.list(channel),
    initialPageParam: 1,
    queryFn: ({ pageParam }): Promise<LeadsPage> =>
      api<LeadsPage>("/provider/leads", {
        query: {
          page: pageParam,
          pageSize: PAGE_SIZE,
          channel: channel === "all" ? undefined : channel,
        },
      }),
    getNextPageParam: (last: LeadsPage): number | undefined =>
      last.page < last.totalPages ? last.page + 1 : undefined,
  });
}

/** Reports a contact as spam, fake or a wrong number. The DialNFind team decides; accepted reports stop counting. */
export function useReportLead(): UseMutationResult<unknown, Error, { leadId: number; reason: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, reason }: { leadId: number; reason: string }): Promise<unknown> =>
      api(`/provider/leads/${leadId}/dispute`, { method: "POST", body: { reason } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}
