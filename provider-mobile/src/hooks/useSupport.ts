import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import type { NewTicketInput, ReplyInput, Ticket, TicketDetail, TicketPage } from "@/types/support";

const PAGE_SIZE = 15;

export const supportKeys = {
  all: ["support"] as const,
  list: ["support", "tickets"] as const,
  ticket: (id: number) => ["support", "ticket", id] as const,
};

/** The signed-in person's support requests, newest activity first, loaded page by page. */
export function useTickets(): UseInfiniteQueryResult<InfiniteData<TicketPage>> {
  return useInfiniteQuery({
    queryKey: supportKeys.list,
    initialPageParam: 1,
    queryFn: ({ pageParam }): Promise<TicketPage> =>
      api<TicketPage>("/support/tickets", { query: { page: pageParam, pageSize: PAGE_SIZE } }),
    getNextPageParam: (last: TicketPage): number | undefined =>
      last.page < last.totalPages ? last.page + 1 : undefined,
  });
}

/** One request and its conversation with the support team. */
export function useTicket(id: number): UseQueryResult<TicketDetail> {
  return useQuery({
    queryKey: supportKeys.ticket(id),
    enabled: Number.isFinite(id) && id > 0,
    queryFn: (): Promise<TicketDetail> => api<TicketDetail>(`/support/tickets/${id}`),
  });
}

export function useCreateTicket(): UseMutationResult<{ ticket: Ticket }, Error, NewTicketInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewTicketInput): Promise<{ ticket: Ticket }> =>
      api<{ ticket: Ticket }>("/support/tickets", {
        method: "POST",
        body: { ...input, subject: input.subject.trim(), message: input.message.trim() },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supportKeys.list });
    },
  });
}

export function useReplyTicket(id: number): UseMutationResult<unknown, Error, ReplyInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReplyInput): Promise<unknown> =>
      api(`/support/tickets/${id}/messages`, {
        method: "POST",
        body: { body: input.body.trim(), attachments: input.attachments },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supportKeys.all });
    },
  });
}

export function useCloseTicket(id: number): UseMutationResult<unknown, Error, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (): Promise<unknown> => api(`/support/tickets/${id}/close`, { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supportKeys.all });
    },
  });
}
