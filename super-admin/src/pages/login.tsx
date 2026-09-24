import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LifeBuoy, Loader2, ShieldCheck, Store } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { email } from "@/lib/validation";
import { Field, fieldA11y, FormAlert } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";

const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password") });
type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") ?? "/";
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const { register, handleSubmit, formState } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), mode: "onTouched", defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const res = await api<{ token: string; user: { role: string } }>("/auth/login", { method: "POST", json: { email: values.email.trim(), password: values.password } });
      if (res.user.role !== "super_admin" && res.user.role !== "admin") {
        setError("This account has no admin access. Only the DialNFind team can sign in here.");
        return;
      }
      await signIn(res.token);
      navigate(next.startsWith("/") ? next : "/", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 md:px-12">
        <Logo />
        <div className="mx-auto my-auto w-full max-w-sm py-10">
          <h1 className="text-3xl font-bold text-brand-deep">Admin sign in</h1>
          <p className="mt-2 text-muted-foreground">For the DialNFind team only.</p>
          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
            <FormAlert message={error} />
            <Field id="email" label="Work email" error={errors.email}>
              <Input type="email" autoComplete="email" inputMode="email" {...fieldA11y("email", errors.email)} {...register("email")} />
            </Field>
            <Field id="password" label="Password" error={errors.password}>
              <div className="relative">
                <Input type={show ? "text" : "password"} autoComplete="current-password" className="pr-10" {...fieldA11y("password", errors.password)} {...register("password")} />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-muted-foreground" aria-label={show ? "Hide password" : "Show password"}>
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />} Sign in
            </Button>
          </form>
          <div className="mt-6 space-y-1 rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">
            <div>
              Super admin: <span className="font-mono text-foreground">admin@dialnfind.com</span>
            </div>
            <div>
              Team: <span className="font-mono text-foreground">ops@</span>, <span className="font-mono text-foreground">support.agent@</span>, <span className="font-mono text-foreground">finance@dialnfind.com</span>
            </div>
            <div>
              Password: <span className="font-mono text-foreground">password123</span>
            </div>
          </div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-brand-deep p-12 text-white lg:flex lg:flex-col lg:justify-center">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-20" />
        <h2 className="relative max-w-md text-3xl font-bold leading-tight">Run the DialNFind marketplace from one place</h2>
        <div className="relative mt-8 space-y-4 text-[oklch(0.88_0.03_266)]">
          {[
            { icon: Store, t: "Approve listings, check documents and manage categories" },
            { icon: LifeBuoy, t: "Answer support tickets from customers and providers" },
            { icon: ShieldCheck, t: "Give each team member only the sections they need" },
          ].map((f) => (
            <div key={f.t} className="flex items-center gap-3">
              <f.icon className="size-5 shrink-0 text-[oklch(0.8_0.1_200)]" /> {f.t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
