import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/services/api";
import { forgetPushToken, storedPushToken } from "@/services/push";
import {
  socialSignOut,
  type ApplePayload,
  type GooglePayload,
} from "@/services/socialAuth";
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

type SocialInput =
  | { provider: "google"; payload: GooglePayload }
  | { provider: "apple"; payload: ApplePayload };

interface SocialResponse extends AuthResponse {
  isNewUser: boolean;
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

  /** Google / Apple: the API verifies the ID token, then signs in, links or creates the account. */
  const socialLogin = useMutation<SocialResponse, Error, SocialInput>({
    mutationFn: ({ provider, payload }: SocialInput): Promise<SocialResponse> =>
      api<SocialResponse>(`/auth/${provider}`, {
        method: "POST",
        token: null,
        body: { ...payload, role: "customer" },
      }),
    onSuccess: ({ token, user }: SocialResponse) => {
      signIn(token, user);
      void qc.invalidateQueries();
    },
  });

  const signOut = (): void => {
    // Ends the session on the server too; the request carries the token before the store clears it.
    const pushToken = storedPushToken();
    void api("/auth/logout", { method: "POST", body: pushToken ? { pushToken } : undefined }).catch(() => undefined);
    forgetPushToken();
    signOutStore();
    void socialSignOut();
    qc.removeQueries({
      predicate: (q) => ["favorites", "my-reviews", "me"].includes(String(q.queryKey[0])),
    });
    void qc.invalidateQueries();
  };

  return { login, register, socialLogin, signOut };
}
