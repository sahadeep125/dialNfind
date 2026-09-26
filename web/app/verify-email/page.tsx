import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NO_INDEX } from "@/lib/seo";
import { getSession } from "@/lib/session";
import { safeRedirect } from "@/lib/safe-redirect";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmail } from "@/components/auth/verify-email";
import { VerifyEmailCode } from "@/components/auth/verify-email-code";

export const metadata: Metadata = { title: "Confirm your email", robots: NO_INDEX };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string; next?: string; sent?: string }> }) {
  const { token, next: rawNext, sent } = await searchParams;
  if (token) {
    return (
      <AuthShell title="Confirm your email" subtitle="One click and your DialNFind account is confirmed.">
        <VerifyEmail token={token} />
      </AuthShell>
    );
  }
  const next = safeRedirect(rawNext);
  const user = await getSession();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/verify-email?next=${next}`)}`);
  if (user.emailVerifiedAt) redirect(next);
  return (
    <AuthShell title="Check your inbox" subtitle="Confirm your email address to start using DialNFind.">
      <VerifyEmailCode email={user.email} next={next} justSent={sent === "1"} />
    </AuthShell>
  );
}
