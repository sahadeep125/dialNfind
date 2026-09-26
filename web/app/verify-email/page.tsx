import type { Metadata } from "next";
import { NO_INDEX } from "@/lib/seo";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmail } from "@/components/auth/verify-email";

export const metadata: Metadata = { title: "Confirm your email", robots: NO_INDEX };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Confirm your email" subtitle="One click and your DialNFind account is confirmed.">
      {token ? <VerifyEmail token={token} /> : <p className="text-sm text-muted-foreground">This link is incomplete. Open the link from the email again.</p>}
    </AuthShell>
  );
}
