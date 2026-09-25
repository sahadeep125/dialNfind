"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientApi, ClientApiError } from "@/lib/client";

/** Confirms the address as soon as the page opens; the token is single-use, so it runs once. */
export function VerifyEmail({ token }: { token: string }) {
  const [state, setState] = useState<{ kind: "working" } | { kind: "done" } | { kind: "failed"; message: string }>({ kind: "working" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    clientApi("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) })
      .then(() => setState({ kind: "done" }))
      .catch((err) => setState({ kind: "failed", message: err instanceof ClientApiError ? err.message : "Could not confirm your email. Try again." }));
  }, [token]);

  return (
    <div className="rounded-2xl border bg-card p-6 text-center" aria-live="polite">
      {state.kind === "working" && (
        <>
          <Loader2 className="mx-auto size-10 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Confirming your email address...</p>
        </>
      )}
      {state.kind === "done" && (
        <>
          <CheckCircle2 className="mx-auto size-10 text-success" />
          <h2 className="mt-3 text-lg font-semibold">Email confirmed</h2>
          <p className="mt-1 text-sm text-muted-foreground">Thanks. We will use this address for important messages about your account.</p>
          <Button asChild className="mt-5">
            <Link href="/dashboard">Go to your dashboard</Link>
          </Button>
        </>
      )}
      {state.kind === "failed" && (
        <>
          <XCircle className="mx-auto size-10 text-destructive" />
          <h2 className="mt-3 text-lg font-semibold">We could not confirm your email</h2>
          <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
          <Button asChild variant="outline" className="mt-5">
            <Link href="/dashboard">Go to your dashboard</Link>
          </Button>
        </>
      )}
    </div>
  );
}
