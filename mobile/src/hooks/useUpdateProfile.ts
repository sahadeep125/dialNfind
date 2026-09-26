import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { api } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { SessionUser } from "@/types";
import { normalizePhone } from "@/utils/validation";

/** Only the fields passed are changed. */
interface ProfileInput {
  name?: string;
  phone?: string;
  /** An uploaded image URL, or null to remove the photo. */
  profilePhotoUrl?: string | null;
}

export function useUpdateProfile(): UseMutationResult<SessionUser, Error, ProfileInput> {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation<SessionUser, Error, ProfileInput>({
    mutationFn: async ({ name, phone, profilePhotoUrl }: ProfileInput): Promise<SessionUser> => {
      const body: Record<string, string | null> = {};
      if (name !== undefined) body.name = name.trim();
      if (phone !== undefined) body.phone = phone ? normalizePhone(phone) : null;
      if (profilePhotoUrl !== undefined) body.profilePhotoUrl = profilePhotoUrl;
      return (await api<{ user: SessionUser }>("/auth/me", { method: "PATCH", body })).user;
    },
    onSuccess: (user: SessionUser) => setUser(user),
  });
}
