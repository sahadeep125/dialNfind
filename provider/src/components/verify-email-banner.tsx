import { useState } from "react";
import { Loader2, MailWarning } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

/** Shown until the account's email address is confirmed. Nothing is blocked; it only asks. */
export function VerifyEmailBanner() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  if (!user || user.emailVerifiedAt) return null;

  async function resend() {
    setSending(true);
    try {
      await api("/auth/resend-verification", { method: "POST" });
      setSent(true);
      toast.success(`We sent a new link to ${user!.email}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <MailWarning className="mt-0.5 size-5 shrink-0 text-warning" />
        <div>
          <div className="font-semibold">Confirm your email address</div>
          <p className="text-sm text-muted-foreground">We sent a link to {user.email}. We use it for leads, claim decisions and plan updates.</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={resend} disabled={sending || sent} className="shrink-0">
        {sending && <Loader2 className="animate-spin" />} {sent ? "Link sent" : "Send a new link"}
      </Button>
    </div>
  );
}
