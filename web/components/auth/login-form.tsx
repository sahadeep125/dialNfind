"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormAlert, fieldA11y } from "@/components/form";
import { email } from "@/lib/validation";

const schema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});
type Values = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema), mode: "onTouched", defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: values.email.trim(), password: values.password }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setError(body?.error?.message ?? "Could not log in");
      return;
    }
    router.push(next.startsWith("/") ? next : "/dashboard");
    router.refresh();
  });

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormAlert message={error} />
        <Field id="email" label="Email" error={errors.email}>
          <Input {...fieldA11y("email", errors.email)} type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" {...register("email")} />
        </Field>
        <div className="space-y-2">
          <div className="flex justify-end">
            <Link href="/forgot-password" className="-mb-7 text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Field id="password" label="Password" error={errors.password}>
            <div className="relative">
              <Input {...fieldA11y("password", errors.password)} type={show ? "text" : "password"} autoComplete="current-password" className="pr-10" {...register("password")} />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-muted-foreground" aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} Log in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to DialNFind?{" "}
        <Link href={`/register${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
      <div className="mt-6 rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">
        Demo account: <span className="font-mono text-foreground">demo@dialnfind.com</span> / <span className="font-mono text-foreground">password123</span>
      </div>
    </>
  );
}
