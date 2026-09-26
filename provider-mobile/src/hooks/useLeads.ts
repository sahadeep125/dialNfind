import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import type { LeadFilters, LeadsPage, LeadStatus } from "@/types/leads";

const PAGE_SIZE = 15;

export const leadKeys = {
  all: ["leads"] as const,
  list: (f: LeadFilters) => ["leads", f.channel, f.status, f.q] as const,
};

/** Leads newest first, loaded 15 at a time, filtered by channel, follow-up status and a search. */
export function useLeads(filters: LeadFilters): UseInfiniteQueryResult<InfiniteData<LeadsPage>> {
  return useInfiniteQuery({
    queryKey: leadKeys.list(filters),
    initialPageParam: 1,
    queryFn: ({ pageParam }): Promise<LeadsPage> =>
      api<LeadsPage>("/provider/leads", {
        query: {
          page: pageParam,
          pageSize: PAGE_SIZE,
          channel: filters.channel === "all" ? undefined : filters.channel,
          status: filters.status === "all" ? undefined : filters.status,
          q: filters.q || undefined,
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

interface LeadUpdate {
  leadId: number;
  status?: LeadStatus;
  note?: string | null;
}

/** The provider's follow-up: where the job stands and a private note. */
export function useUpdateLead(): UseMutationResult<unknown, Error, LeadUpdate> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, ...body }: LeadUpdate): Promise<unknown> =>
      api(`/provider/leads/${leadId}`, { method: "PATCH", body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}
