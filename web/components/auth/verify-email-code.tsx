"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormAlert } from "@/components/form";
import { clientApi, ClientApiError } from "@/lib/client";

/** Signed in but not confirmed: the only thing left to do is type the emailed code (or sign out). */
export function VerifyEmailCode({ email, next, justSent }: { email: string; next: string; justSent: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [wait, setWait] = useState(justSent ? 60 : 0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function submit(value: string) {
    if (checking) return;
    setError(null);
    setChecking(true);
    try {
      await clientApi("/auth/verify-email/code", { method: "POST", body: JSON.stringify({ code: value }) });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not check the code. Try again.");
      setChecking(false);
    }
  }

  async function resend() {
    setError(null);
    setSending(true);
    try {
      const r = await clientApi<{ retryAfter: number }>("/auth/resend-verification", { method: "POST" });
      setWait(r.retryAfter);
      setCode("");
    } catch (err) {
      if (err instanceof ClientApiError && typeof err.details?.retryAfter === "number") setWait(err.details.retryAfter);
      else setError(err instanceof ClientApiError ? err.message : "Could not send the email. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card p-5 text-center">
        <MailCheck className="mx-auto size-9 text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>. Enter it below, or tap the link in the same email.
        </p>
      </div>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length === 6) void submit(code);
        }}
      >
        <FormAlert message={error} />
        <label htmlFor="code" className="sr-only">
          6-digit code
        </label>
        <Input
          id="code"
          value={code}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(digits);
            if (digits.length === 6) void submit(digits);
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="000000"
          aria-invalid={!!error || undefined}
          className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
        />
        <Button type="submit" className="w-full" disabled={code.length !== 6 || checking}>
          {checking && <Loader2 className="animate-spin" />} Confirm email
        </Button>
      </form>
      <div className="flex items-center justify-between text-sm">
        <Button variant="link" className="px-0" onClick={resend} disabled={sending || wait > 0}>
          {wait > 0 ? `Send a new code in ${wait}s` : justSent ? "Send a new code" : "Email me a code"}
        </Button>
        <Button variant="link" className="px-0 text-muted-foreground" onClick={signOut}>
          Wrong email? Sign out
        </Button>
      </div>
    </div>
  );
}
