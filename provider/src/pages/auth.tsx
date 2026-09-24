import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { BarChart3, BadgeCheck, Loader2, PhoneCall } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { BusinessIllustration } from "@/components/illustrations";

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 md:px-12">
        <Logo />
        <div className="mx-auto my-auto w-full max-w-sm py-10">
          <h1 className="text-3xl font-bold text-brand-deep">{title}</h1>
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-brand-deep p-12 text-white lg:flex lg:flex-col lg:justify-center">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-20" />
        <BusinessIllustration className="relative mx-auto w-96" />
        <h2 className="relative mt-10 max-w-md text-3xl font-bold leading-tight">Grow your local business with DialNFind</h2>
        <div className="relative mt-6 space-y-3 text-[oklch(0.88_0.03_266)]">
          {[
            { icon: PhoneCall, t: "Customers call you directly, no commission" },
            { icon: BadgeCheck, t: "Get verified and rank higher in search" },
            { icon: BarChart3, t: "Track calls, WhatsApp enquiries and reviews" },
          ].map((f) => (
            <div key={f.t} className="flex items-center gap-3">
              <f.icon className="size-5 text-[oklch(0.8_0.1_200)]" /> {f.t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") ?? "/";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ token: string; user: User }>("/auth/login", { method: "POST", json: { email: form.get("email"), password: form.get("password") } });
      await signIn(res.token);
      navigate(next, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell title="Log in to your business" subtitle="Manage your listing, leads and reviews.">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Log in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to={`/register${params.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-primary hover:underline">
          Create a business account
        </Link>
      </p>
      <div className="mt-6 space-y-1 rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">
        <div>
          Demo with a listing: <span className="font-mono text-foreground">provider@dialnfind.com</span>
        </div>
        <div>
          Demo without a listing: <span className="font-mono text-foreground">newprovider@dialnfind.com</span>
        </div>
        <div>
          Password: <span className="font-mono text-foreground">password123</span>
        </div>
      </div>
    </Shell>
  );
}

export function RegisterPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") ?? "/start";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accept, setAccept] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accept) {
      setError("Please accept the terms to continue");
      return;
    }
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ token: string }>("/auth/register", {
        method: "POST",
        json: { name: form.get("name"), email: form.get("email"), phone: form.get("phone") || undefined, password: form.get("password"), role: "provider", acceptTerms: true },
      });
      await signIn(res.token);
      navigate(next, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell title="Create your business account" subtitle="Free to join. Takes about three minutes to get listed.">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" required minLength={2} autoComplete="name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Mobile number</Label>
          <Input id="phone" name="phone" type="tel" placeholder="+91 98xxx xxxxx" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
        </div>
        <label className="flex items-start gap-3 text-sm text-muted-foreground">
          <Checkbox checked={accept} onCheckedChange={(v) => setAccept(v === true)} className="mt-0.5" />
          <span>I agree to the provider terms and consent to my business phone number being shown to customers.</span>
        </label>
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </Shell>
  );
}
