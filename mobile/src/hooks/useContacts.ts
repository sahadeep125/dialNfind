import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ContactsPage } from "@/types";
import { queryKeys } from "./queryKeys";

const PAGE_SIZE = 20;

/** Providers the person called or messaged, newest first, loaded page by page. */
export function useContacts(): UseInfiniteQueryResult<InfiniteData<ContactsPage>> {
  const signedIn = useAuthStore((s) => !!s.token);
  return useInfiniteQuery({
    queryKey: queryKeys.contacts,
    enabled: signedIn,
    initialPageParam: 1,
    queryFn: ({ pageParam }): Promise<ContactsPage> =>
      api<ContactsPage>("/me/contacts", { query: { page: pageParam, pageSize: PAGE_SIZE } }),
    getNextPageParam: (last: ContactsPage): number | undefined =>
      last.page < last.totalPages ? last.page + 1 : undefined,
  });
}

/** Saves the answer to "Did they respond?", which feeds the provider's ranking. */
export function useAnswerContact(): UseMutationResult<
  unknown,
  Error,
  { id: number; responded: boolean }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, responded }: { id: number; responded: boolean }) =>
      api(`/leads/${id}/response`, { method: "PATCH", body: { responded } }),
    onMutate: ({ id, responded }) => {
      qc.setQueryData<InfiniteData<ContactsPage>>(queryKeys.contacts, (current) =>
        current
          ? {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                contacts: page.contacts.map((c) =>
                  c.id === id ? { ...c, customerReportedResponse: responded } : c,
                ),
              })),
            }
          : current,
      );
    },
    onError: () => void qc.invalidateQueries({ queryKey: queryKeys.contacts }),
  });
}
