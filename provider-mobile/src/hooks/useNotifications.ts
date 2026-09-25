import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { NotificationsResponse } from "@/types/notifications";

export const notificationKeys = {
  all: ["notifications"] as const,
};

/** The latest 50 notifications and how many are unread. */
export function useNotifications(): UseQueryResult<NotificationsResponse> {
  const signedIn = useAuthStore((s) => !!s.token);
  return useQuery({
    queryKey: notificationKeys.all,
    enabled: signedIn,
    queryFn: () => api<NotificationsResponse>("/me/notifications"),
  });
}

/** Marks the given notifications as read, or all of them when no ids are passed. */
export function useMarkNotificationsRead(): UseMutationResult<
  unknown,
  Error,
  number[] | undefined
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids?: number[]) =>
      api("/me/notifications/read", { method: "POST", body: ids ? { ids } : {} }),
    onMutate: (ids?: number[]) => {
      queryClient.setQueryData<NotificationsResponse>(notificationKeys.all, (current) => {
        if (!current) return current;
        const notifications = current.notifications.map((n) =>
          !ids || ids.includes(n.id) ? { ...n, isRead: true } : n,
        );
        return { notifications, unread: notifications.filter((n) => !n.isRead).length };
      });
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
