import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await getSession()) redirect("/dashboard");
  return (
    <AuthShell title="Welcome back" subtitle="Log in to see your favorites, recent contacts and reviews.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
