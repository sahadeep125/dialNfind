import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import { useAuthActions } from "./useAuthActions";

/** Permanently closes a customer account after confirming the password, then signs out. */
export function useDeleteAccount(): UseMutationResult<void, Error, string> {
  const { signOut } = useAuthActions();
  return useMutation<void, Error, string>({
    mutationFn: async (password: string): Promise<void> => {
      await api("/auth/me", { method: "DELETE", body: { password } });
    },
    onSuccess: () => signOut(),
  });
}
