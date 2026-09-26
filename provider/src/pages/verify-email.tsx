import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { CheckCircle2, Loader2, MailCheck, XCircle } from "lucide-react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FormAlert } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shell } from "@/pages/auth";

/** Email confirmation: the emailed link (?token=) or, for a signed-in account, the 6-digit code. */
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
  const token = params.get("token");
  if (token) return <VerifyLink token={token} />;
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.emailVerifiedAt) return <Navigate to="/" replace />;
  return <VerifyCode email={user.email} justSent={params.get("sent") === "1"} />;
}

function VerifyLink({ token }: { token: string }) {
  const { user, refresh } = useAuth();
  const [state, setState] = useState<{ kind: "working" } | { kind: "done" } | { kind: "failed"; message: string }>({ kind: "working" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api("/auth/verify-email", { method: "POST", json: { token } })
      .then(() => refresh())
      .then(() => setState({ kind: "done" }))
      .catch((err) => setState({ kind: "failed", message: errorMessage(err) }));
  }, [token, refresh]);

  return (
    <Shell title="Confirm your email" subtitle="One click and your business account is confirmed.">
      <div className="rounded-2xl border bg-card p-6 text-center" aria-live="polite">
        {state.kind === "working" && <Loader2 className="mx-auto size-10 animate-spin text-primary" />}
        {state.kind === "done" && (
          <>
            <CheckCircle2 className="mx-auto size-10 text-success" />
            <h2 className="mt-3 text-lg font-semibold">Email confirmed</h2>
            <Button asChild className="mt-5">
              <Link to={user ? "/" : "/login"}>{user ? "Continue" : "Sign in"}</Link>
            </Button>
          </>
        )}
        {state.kind === "failed" && (
          <>
            <XCircle className="mx-auto size-10 text-destructive" />
            <p className="mt-3 text-sm text-muted-foreground">{state.message}</p>
            <Button asChild variant="outline" className="mt-5">
              <Link to={user ? "/verify-email" : "/login"}>{user ? "Enter the code instead" : "Sign in"}</Link>
            </Button>
          </>
        )}
      </div>
    </Shell>
  );
}

function VerifyCode({ email, justSent }: { email: string; justSent: boolean }) {
  const navigate = useNavigate();
  const { refresh, signOut } = useAuth();
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
      await api("/auth/verify-email/code", { method: "POST", json: { code: value } });
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setChecking(false);
    }
  }

  async function resend() {
    setError(null);
    setSending(true);
    try {
      const r = await api<{ retryAfter: number }>("/auth/resend-verification", { method: "POST" });
      setWait(r.retryAfter);
      setCode("");
    } catch (err) {
      const retryAfter = err instanceof ApiError ? (err.details as { retryAfter?: number } | undefined)?.retryAfter : undefined;
      if (retryAfter) setWait(retryAfter);
      else setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <Shell title="Check your inbox" subtitle="Confirm your email address to set up your business.">
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
    </Shell>
  );
}
