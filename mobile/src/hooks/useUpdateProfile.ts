import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { SessionUser } from "@/types";
import { normalizePhone } from "@/utils/validation";

interface ProfileInput {
  name: string;
  phone: string;
}

export function useUpdateProfile(): UseMutationResult<SessionUser, Error, ProfileInput> {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation<SessionUser, Error, ProfileInput>({
    mutationFn: async ({ name, phone }: ProfileInput): Promise<SessionUser> =>
      (
        await api<{ user: SessionUser }>("/auth/me", {
          method: "PATCH",
          body: { name: name.trim(), phone: phone ? normalizePhone(phone) : null },
        })
      ).user,
    onSuccess: (user: SessionUser) => setUser(user),
  });
}
