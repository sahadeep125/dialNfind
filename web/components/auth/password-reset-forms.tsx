"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormAlert, fieldA11y } from "@/components/form";
import { clientApi, ClientApiError } from "@/lib/client";
import { email, password } from "@/lib/validation";

const forgotSchema = z.object({ email });

/** Asks the API to email a reset link. The answer is the same whether or not the account exists. */
export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema), mode: "onTouched", defaultValues: { email: "" } });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);
    try {
      await clientApi("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: email.trim() }) });
      setSentTo(email.trim());
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not send the email. Try again.");
    }
  });

  if (sentTo) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <MailCheck className="mx-auto size-10 text-primary" />
        <h2 className="mt-3 text-lg font-semibold">Check your email</h2>
        <p className="mt-1 text-sm text-muted-foreground">If {sentTo} has a DialNFind account, we sent it a link to choose a new password. The link works for one hour.</p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/login">Back to log in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormAlert message={error} />
      <Field id="email" label="Email" error={errors.email?.message}>
        <Input {...fieldA11y("email", errors.email?.message)} type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" {...register("email")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />} Send reset link
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

const resetSchema = z
  .object({ newPassword: password, confirm: z.string().min(1, "Type the password again") })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "The passwords do not match" });

/** Sets a new password using the token from the emailed link. */
export function ResetPasswordForm({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema), mode: "onTouched", defaultValues: { newPassword: "", confirm: "" } });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async ({ newPassword }) => {
    setError(null);
    try {
      await clientApi("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, newPassword }) });
      setDone(true);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not change the password. Try again.");
    }
  });

  if (done) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" />
        <h2 className="mt-3 text-lg font-semibold">Password changed</h2>
        <p className="mt-1 text-sm text-muted-foreground">You have been signed out everywhere. Log in with your new password.</p>
        <Button asChild className="mt-5">
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormAlert message={error} />
      <Field id="newPassword" label="New password" error={errors.newPassword?.message} hint="At least 8 characters with a letter and a number.">
        <div className="relative">
          <Input {...fieldA11y("newPassword", errors.newPassword?.message, true)} type={show ? "text" : "password"} autoComplete="new-password" className="pr-10" {...register("newPassword")} />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-muted-foreground" aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>
      <Field id="confirm" label="Confirm new password" error={errors.confirm?.message}>
        <Input {...fieldA11y("confirm", errors.confirm?.message)} type={show ? "text" : "password"} autoComplete="new-password" {...register("confirm")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />} Change password
      </Button>
    </form>
  );
}
