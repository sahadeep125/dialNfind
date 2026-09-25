"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { APPLE_REDIRECT_URI, APPLE_SERVICES_ID, GOOGLE_CLIENT_ID } from "@/lib/config";
import { appleSignIn, renderGoogleButton, SocialCancelled, type SocialPayload, type SocialProvider } from "@/lib/social-auth";

const googleOn = Boolean(GOOGLE_CLIENT_ID);
const appleOn = Boolean(APPLE_SERVICES_ID && APPLE_REDIRECT_URI);

export const socialSignInAvailable = googleOn || appleOn;

interface Props {
  mode: "signin" | "signup";
  onError: (message: string | null) => void;
  onSignedIn: (result: { isNewUser: boolean }) => void;
}

/** "Continue with Google / Apple" plus an "or" divider. Renders nothing when neither is configured. */
export function SocialButtons({ mode, onError, onSignedIn }: Props) {
  const googleRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<SocialProvider | null>(null);

  const finish = useCallback(
    async (provider: SocialProvider, payload: SocialPayload) => {
      setBusy(provider);
      onError(null);
      try {
        const res = await fetch("/api/auth/social", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ provider, ...payload }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error?.message ?? "Could not sign you in. Please try again.");
        onSignedIn({ isNewUser: Boolean(body?.isNewUser) });
      } catch (err) {
        onError(err instanceof Error ? err.message : "Could not sign you in. Please try again.");
        setBusy(null);
      }
    },
    [onError, onSignedIn],
  );

  useEffect(() => {
    const el = googleRef.current;
    if (!googleOn || !el) return;
    renderGoogleButton(el, GOOGLE_CLIENT_ID, (payload) => void finish("google", payload), mode === "signup" ? "signup_with" : "continue_with").catch((err) =>
      onError(err instanceof Error ? err.message : "Google sign-in is unavailable right now."),
    );
  }, [finish, mode, onError]);

  const onApple = async () => {
    onError(null);
    try {
      const payload = await appleSignIn(APPLE_SERVICES_ID, APPLE_REDIRECT_URI);
      await finish("apple", payload);
    } catch (err) {
      if (!(err instanceof SocialCancelled)) onError(err instanceof Error ? err.message : "Apple sign-in did not complete.");
    }
  };

  if (!socialSignInAvailable) return null;

  return (
    <div className="space-y-5">
      <div className="relative space-y-3" aria-busy={busy !== null}>
        {appleOn && (
          <button
            type="button"
            onClick={onApple}
            disabled={busy !== null}
            className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-black text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {busy === "apple" ? <Loader2 className="size-4 animate-spin" /> : <AppleLogo />}
            {mode === "signup" ? "Sign up with Apple" : "Continue with Apple"}
          </button>
        )}
        {googleOn && (
          <div className="relative">
            {/* Google draws its own button here. */}
            <div ref={googleRef} className="flex h-10 w-full justify-center [color-scheme:light]" />
            {busy === "google" && (
              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/80">
                <Loader2 className="size-4 animate-spin" aria-label="Signing in with Google" />
              </div>
            )}
          </div>
        )}
        <p className="text-center text-xs text-muted-foreground">By continuing you agree to the DialNFind terms of use.</p>
      </div>
      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or use your email
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
    </svg>
  );
}
