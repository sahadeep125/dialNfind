import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { router } from "expo-router";

import { api, errorMessage } from "@/services/api";
import { track } from "@/services/analytics";
import { useAuthStore } from "@/stores/useAuthStore";
import { useToast } from "./useToast";

interface ToggleInput {
  providerId: number;
  isFavorite: boolean;
}

/** Saves or removes a favorite. Guests are sent to sign in first. */
export function useToggleFavorite(): UseMutationResult<void, Error, ToggleInput> & {
  toggle: (input: ToggleInput) => void;
} {
  const qc = useQueryClient();
  const toast = useToast();
  const signedIn = useAuthStore((s) => !!s.token);
  const mutation = useMutation<void, Error, ToggleInput>({
    mutationFn: async ({ providerId, isFavorite }: ToggleInput): Promise<void> => {
      await api(`/me/favorites/${providerId}`, { method: isFavorite ? "DELETE" : "PUT" });
    },
    onSuccess: (_data: void, { providerId, isFavorite }: ToggleInput) => {
      track("favorite_toggled", { provider_id: providerId, favorited: !isFavorite });
      toast(isFavorite ? "Removed from favorites" : "Saved to favorites", "success");
      void qc.invalidateQueries({
        predicate: (q) =>
          ["favorites", "featured", "search", "provider"].includes(String(q.queryKey[0])),
      });
    },
    onError: (error: Error) => toast(errorMessage(error), "error"),
  });
  const toggle = (input: ToggleInput): void => {
    if (!signedIn) {
      toast("Sign in to save favorites", "info");
      router.push("/login");
      return;
    }
    mutation.mutate(input);
  };
  return Object.assign(mutation, { toggle });
}
