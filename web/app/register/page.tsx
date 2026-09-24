import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage() {
  if (await getSession()) redirect("/dashboard");
  return (
    <AuthShell title="Create your account" subtitle="Save favorite providers, keep track of who you called, and share reviews.">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
