import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/password-reset-forms";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Choose a new password" subtitle="This works for DialNFind customer, business and team accounts.">
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="rounded-2xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">This link is incomplete. Open the link from the email again, or ask for a new one.</p>
          <Button asChild className="mt-5">
            <Link href="/forgot-password">Ask for a new link</Link>
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
