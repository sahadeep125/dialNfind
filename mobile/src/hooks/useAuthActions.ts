import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/services/api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { SessionUser } from "@/types";
import { normalizePhone } from "@/utils/validation";

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput extends LoginInput {
  name: string;
  phone: string;
}

interface AuthResponse {
  token: string;
  user: SessionUser;
}

/** Sign in, create an account and sign out. On success the whole cache refreshes so lists show favorites. */
export function useAuthActions() {
  const qc = useQueryClient();
  const signIn = useAuthStore((s) => s.signIn);
  const signOutStore = useAuthStore((s) => s.signOut);

  const login = useMutation<AuthResponse, Error, LoginInput>({
    mutationFn: (input: LoginInput): Promise<AuthResponse> =>
      api<AuthResponse>("/auth/login", {
        method: "POST",
        body: { email: input.email.trim().toLowerCase(), password: input.password },
        token: null,
      }),
    onSuccess: ({ token, user }: AuthResponse) => {
      signIn(token, user);
      void qc.invalidateQueries();
    },
  });

  const register = useMutation<AuthResponse, Error, RegisterInput>({
    mutationFn: (input: RegisterInput): Promise<AuthResponse> =>
      api<AuthResponse>("/auth/register", {
        method: "POST",
        token: null,
        body: {
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          password: input.password,
          phone: input.phone ? normalizePhone(input.phone) : "",
          role: "customer",
          acceptTerms: true,
        },
      }),
    onSuccess: ({ token, user }: AuthResponse) => {
      signIn(token, user);
      void qc.invalidateQueries();
    },
  });

  const signOut = (): void => {
    signOutStore();
    qc.removeQueries({
      predicate: (q) => ["favorites", "my-reviews", "me"].includes(String(q.queryKey[0])),
    });
    void qc.invalidateQueries();
  };

  return { login, register, signOut };
}
