"use client";

import { useState } from "react";
import { Loader2, MailWarning } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clientApi, ClientApiError } from "@/lib/client";

/** Shown until the account's email address is confirmed. Nothing is blocked; it only asks. */
export function VerifyEmailBanner({ email }: { email: string }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function resend() {
    setSending(true);
    try {
      await clientApi("/auth/resend-verification", { method: "POST" });
      setSent(true);
      toast.success(`We sent a new link to ${email}`);
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not send the email. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <MailWarning className="mt-0.5 size-5 shrink-0 text-warning" />
        <div>
          <div className="font-semibold">Confirm your email address</div>
          <p className="text-sm text-muted-foreground">We sent a link to {email}. Confirming it lets us reach you about your account.</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={resend} disabled={sending || sent} className="shrink-0">
        {sending && <Loader2 className="animate-spin" />} {sent ? "Link sent" : "Send a new link"}
      </Button>
    </div>
  );
}
