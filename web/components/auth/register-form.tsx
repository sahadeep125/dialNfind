"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Field, FormAlert, fieldA11y } from "@/components/form";
import { SocialButtons } from "@/components/auth/social-buttons";
import { safeRedirect } from "@/lib/safe-redirect";
import { email, normalizePhone, optionalPhone, password, personName } from "@/lib/validation";

const schema = z.object({
  name: personName,
  email,
  phone: optionalPhone,
  password,
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Accept the terms to continue" }) }),
});
type Values = z.input<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeRedirect(params.get("next"));
  const onSocialSignedIn = useCallback(() => {
    router.push(next);
    router.refresh();
  }, [router, next]);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const { register, control, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { name: "", email: "", phone: "", password: "", acceptTerms: false as unknown as true },
  });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone ? normalizePhone(values.phone) : undefined,
        password: values.password,
        acceptTerms: true,
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setError(body?.error?.message ?? "Could not create your account");
      return;
    }
    router.push(next);
    router.refresh();
  });

  return (
    <>
      <div className="mb-5">
        <SocialButtons mode="signup" onError={setError} onSignedIn={onSocialSignedIn} />
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormAlert message={error} />
        <Field id="name" label="Full name" error={errors.name}>
          <Input {...fieldA11y("name", errors.name)} autoComplete="name" maxLength={80} placeholder="Your name" {...register("name")} />
        </Field>
        <Field id="email" label="Email" error={errors.email}>
          <Input {...fieldA11y("email", errors.email)} type="email" autoComplete="email" inputMode="email" maxLength={254} placeholder="you@example.com" {...register("email")} />
        </Field>
        <Field id="phone" label="Phone" error={errors.phone} hint="10-digit mobile number. Used only for account recovery." optional>
          <Input {...fieldA11y("phone", errors.phone, true)} type="tel" autoComplete="tel" inputMode="tel" maxLength={16} placeholder="98xxx xxxxx" {...register("phone")} />
        </Field>
        <Field id="password" label="Password" error={errors.password} hint="At least 8 characters, with a letter and a number.">
          <div className="relative">
            <Input {...fieldA11y("password", errors.password, true)} type={show ? "text" : "password"} autoComplete="new-password" className="pr-10" {...register("password")} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-muted-foreground" aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <div className="space-y-1.5">
          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <Controller
              control={control}
              name="acceptTerms"
              render={({ field }) => (
                <Checkbox
                  id="acceptTerms"
                  checked={field.value === true}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  onBlur={field.onBlur}
                  aria-invalid={errors.acceptTerms ? true : undefined}
                  aria-describedby={errors.acceptTerms ? "acceptTerms-error" : undefined}
                  className="mt-0.5"
                />
              )}
            />
            <span>I agree to the terms of use and understand that provider phone numbers are shown publicly with their consent.</span>
          </label>
          {errors.acceptTerms && (
            <p id="acceptTerms-error" role="alert" className="pl-7 text-xs font-medium text-destructive">
              {errors.acceptTerms.message}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={`/login${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
