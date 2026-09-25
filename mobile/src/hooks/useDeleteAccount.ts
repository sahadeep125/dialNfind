import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import { useAuthActions } from "./useAuthActions";

/**
 * Permanently closes a customer account, then signs out. Needs the password when the account has one
 * (accounts made with Google or Apple do not).
 */
export function useDeleteAccount(): UseMutationResult<void, Error, string | undefined> {
  const { signOut } = useAuthActions();
  return useMutation<void, Error, string | undefined>({
    mutationFn: async (password: string | undefined): Promise<void> => {
      await api("/auth/me", { method: "DELETE", body: { password } });
    },
    onSuccess: () => signOut(),
  });
}
