import type { Metadata } from "next";
import { NO_INDEX } from "@/lib/seo";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/password-reset-forms";

export const metadata: Metadata = { title: "Forgot password", robots: NO_INDEX };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Forgot your password?" subtitle="Enter the email you use for DialNFind and we will send you a link to choose a new one.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
