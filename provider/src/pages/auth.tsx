import { useCallback, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BarChart3, BadgeCheck, Loader2, MailCheck, PhoneCall } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { User } from "@/lib/types";
import { email, normalizePhone, optionalPhone, password, personName } from "@/lib/validation";
import { Field, fieldA11y, FormAlert } from "@/components/form";
import { SocialButtons } from "@/components/social-buttons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { BusinessIllustration } from "@/components/illustrations";

export function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
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

const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password") });
type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") ?? "/";
  const [error, setError] = useState<string | null>(null);
  // New accounts go through setup first; the dashboard gate would send them there anyway.
  const onSocialSignedIn = useCallback(({ isNewUser }: { isNewUser: boolean }) => navigate(isNewUser ? "/start" : next, { replace: true }), [navigate, next]);
  const { register, handleSubmit, formState } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const res = await api<{ token: string; user: User }>("/auth/login", { method: "POST", json: values });
      await signIn(res.token);
      navigate(next, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <Shell title="Log in to your business" subtitle="Manage your listing, leads and reviews.">
      <div className="mb-5">
        <SocialButtons mode="signin" onError={setError} onSignedIn={onSocialSignedIn} />
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormAlert message={error} />
        <Field id="email" label="Email" error={errors.email}>
          <Input type="email" autoComplete="email" inputMode="email" {...fieldA11y("email", errors.email)} {...register("email")} />
        </Field>
        <div className="space-y-2">
          <div className="flex justify-end">
            <Link to="/forgot-password" className="-mb-7 text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Field id="password" label="Password" error={errors.password}>
            <Input type="password" autoComplete="current-password" {...fieldA11y("password", errors.password)} {...register("password")} />
          </Field>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} Log in
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

const registerSchema = z.object({
  name: personName,
  email,
  phone: optionalPhone,
  password,
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Accept the terms to continue" }) }),
});
type RegisterValues = z.input<typeof registerSchema>;

export function RegisterPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") ?? "/start";
  const [error, setError] = useState<string | null>(null);
  const onSocialSignedIn = useCallback(({ isNewUser }: { isNewUser: boolean }) => navigate(isNewUser ? "/start" : next, { replace: true }), [navigate, next]);
  const { register, handleSubmit, control, formState } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", acceptTerms: false as unknown as true },
    mode: "onTouched",
  });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const res = await api<{ token: string }>("/auth/register", {
        method: "POST",
        json: { ...values, phone: values.phone ? normalizePhone(values.phone) : undefined, role: "provider" },
      });
      await signIn(res.token);
      navigate("/verify-email?sent=1", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <Shell title="Create your business account" subtitle="Free to join. Takes about three minutes to get listed.">
      <div className="mb-5">
        <SocialButtons mode="signup" onError={setError} onSignedIn={onSocialSignedIn} />
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormAlert message={error} />
        <Field id="name" label="Your name" error={errors.name} required>
          <Input autoComplete="name" {...fieldA11y("name", errors.name)} {...register("name")} />
        </Field>
        <Field id="email" label="Email" error={errors.email} required>
          <Input type="email" autoComplete="email" inputMode="email" {...fieldA11y("email", errors.email)} {...register("email")} />
        </Field>
        <Field id="phone" label="Mobile number" error={errors.phone} optional hint="10-digit Indian mobile number">
          <Input type="tel" autoComplete="tel" inputMode="tel" placeholder="98xxx xxxxx" {...fieldA11y("phone", errors.phone, true)} {...register("phone")} />
        </Field>
        <Field id="password" label="Password" error={errors.password} required hint="At least 8 characters with a letter and a number">
          <Input type="password" autoComplete="new-password" {...fieldA11y("password", errors.password, true)} {...register("password")} />
        </Field>
        <div className="space-y-1.5">
          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <Controller
              control={control}
              name="acceptTerms"
              render={({ field }) => (
                <Checkbox
                  checked={field.value === true}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  onBlur={field.onBlur}
                  aria-invalid={errors.acceptTerms ? true : undefined}
                  aria-describedby={errors.acceptTerms ? "terms-error" : undefined}
                  className="mt-0.5"
                />
              )}
            />
            <span>
              I agree to the{" "}
              <Link to="/terms" target="_blank" className="font-medium text-primary hover:underline">
                terms for businesses
              </Link>{" "}
              and{" "}
              <Link to="/privacy" target="_blank" className="font-medium text-primary hover:underline">
                privacy policy
              </Link>
              , and consent to my business phone number being shown to customers.
            </span>
          </label>
          {errors.acceptTerms && (
            <p id="terms-error" role="alert" className="pl-7 text-xs font-medium text-destructive">
              {errors.acceptTerms.message}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} Create account
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

const forgotSchema = z.object({ email });

/** Sends the reset link. The link opens the DialNFind website, which works for business accounts too. */
export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });
  const { errors, isSubmitting } = formState;
  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await api("/auth/forgot-password", { method: "POST", json: values });
      setSentTo(values.email);
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <Shell title="Reset your password" subtitle="We will email you a link to choose a new password.">
      {sentTo ? (
        <div role="status" className="space-y-4 rounded-xl border bg-card p-5">
          <MailCheck className="size-8 text-success" />
          <p className="text-sm">
            If an account exists for <span className="font-medium">{sentTo}</span>, a reset link is on its way. It works for one hour. Check your spam folder if it does not arrive in a few minutes.
          </p>
          <Button variant="outline" className="w-full" onClick={() => setSentTo(null)}>
            Use a different email
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <FormAlert message={error} />
          <Field id="email" label="Email" error={errors.email}>
            <Input type="email" autoComplete="email" inputMode="email" autoFocus {...fieldA11y("email", errors.email)} {...register("email")} />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />} Send reset link
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </Shell>
  );
}
