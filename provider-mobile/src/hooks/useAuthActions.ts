import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/services/api";
import {
  socialSignOut,
  type ApplePayload,
  type GooglePayload,
} from "@/services/socialAuth";
import { useAuthStore } from "@/stores/useAuthStore";
import { resetPurchases } from "@/services/purchases";
import { forgetPushToken, storedPushToken } from "@/services/push";
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

interface DeleteResult {
  ok: boolean;
  storeSubscription: "app_store" | "play_store" | null;
}

interface SocialResponse extends AuthResponse {
  isNewUser: boolean;
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

  /** Google / Apple: the API verifies the ID token, then signs in, links or creates a business account. */
  const socialLogin = useMutation<SocialResponse, Error, SocialInput>({
    mutationFn: ({ provider, payload }: SocialInput): Promise<SocialResponse> =>
      api<SocialResponse>(`/auth/${provider}`, {
        method: "POST",
        token: null,
        body: { ...payload, role: "provider" },
      }),
    onSuccess: ({ token, user }: SocialResponse) => {
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
    // Ends the session on the server too; the request carries the token before the store clears it.
    // The push token goes with it so this device stops getting the account's alerts.
    const pushToken = storedPushToken();
    void api("/auth/logout", { method: "POST", body: pushToken ? { pushToken } : undefined }).catch(() => undefined);
    forgetPushToken();
    signOutStore();
    void socialSignOut();
    void resetPurchases();
    qc.clear();
  };

  /**
   * Deletes the business account: the listing leaves search, the plan stops renewing and the session
   * ends. Returns the store a plan was bought in, which the person must cancel there.
   */
  const deleteAccount = useMutation<DeleteResult, Error, { password?: string; confirm?: string }>({
    mutationFn: (input) => api<DeleteResult>("/auth/me", { method: "DELETE", body: input }),
    onSuccess: () => {
      // The server already ended the session; clear everything local without calling logout.
      forgetPushToken();
      signOutStore();
      void socialSignOut();
      void resetPurchases();
      qc.clear();
    },
  });

  return { login, register, socialLogin, applyToken, signOut, deleteAccount };
}
