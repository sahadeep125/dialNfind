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

/** Sign in, create a business account, swap in a new token after onboarding, and sign out. */
export function useAuthActions() {
  const qc = useQueryClient();
  const signIn = useAuthStore((s) => s.signIn);
  const setToken = useAuthStore((s) => s.setToken);
  const signOutStore = useAuthStore((s) => s.signOut);

  const login = useMutation<AuthResponse, Error, LoginInput>({
    mutationFn: (input: LoginInput): Promise<AuthResponse> =>
      api<AuthResponse>("/auth/login", {
        method: "POST",
        body: { email: input.email.trim().toLowerCase(), password: input.password },
        token: null,
      }),
    onSuccess: ({ token, user }: AuthResponse) => {
      qc.clear();
      signIn(token, user);
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
          role: "provider",
          acceptTerms: true,
        },
      }),
    onSuccess: ({ token, user }: AuthResponse) => {
      qc.clear();
      signIn(token, user);
    },
  });

  /** Onboarding and claims can return a fresh token that carries the new provider role. */
  const applyToken = async (token: string | null): Promise<void> => {
    if (token) setToken(token);
    await qc.invalidateQueries({ queryKey: ["session"] });
    await qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const signOut = (): void => {
    signOutStore();
    qc.clear();
  };

  return { login, register, applyToken, signOut };
}
