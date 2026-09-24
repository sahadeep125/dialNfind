"use client";

import { useState } from "react";
import { Flag, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Field, fieldA11y } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { clientApi, ClientApiError } from "@/lib/client";

export function ShareButton({ title }: { title: string }) {
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* dismissed */
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }
  return (
    <Button variant="outline" size="icon" className="rounded-full" onClick={share} aria-label="Share">
      <Share2 />
    </Button>
  );
}

export function ReportListing({ slug }: { slug: string }) {
  return (
    <ReportDialog
      endpoint={`/providers/${slug}/report`}
      trigger="Report this listing"
      title="Report this listing"
      description="Wrong number, closed business, or something unsafe? Tell us and we will check it."
      placeholder="What is wrong with this listing?"
      done="Thanks. Our team will review this listing."
    />
  );
}

export function ReportReview({ reviewId }: { reviewId: number }) {
  return (
    <ReportDialog
      endpoint={`/reviews/${reviewId}/report`}
      trigger="Report"
      title="Report this review"
      description="Fake, abusive or not about this business? Tell us and our team will check it."
      placeholder="What is wrong with this review?"
      done="Thanks. Our team will review it."
    />
  );
}

function ReportDialog({ endpoint, trigger, title, description, placeholder, done }: { endpoint: string; trigger: string; title: string; description: string; placeholder: string; done: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fieldId = `report-${endpoint.replace(/\W+/g, "-")}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = reason.trim();
    const problem = text.length < 5 ? "Describe the problem in at least 5 characters" : text.length > 500 ? "Keep it under 500 characters" : null;
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await clientApi(endpoint, { method: "POST", body: JSON.stringify({ reason: text }) });
      toast.success(done);
      setOpen(false);
      setReason("");
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not send the report. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <button type="button" className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Flag className="size-3.5" /> {trigger}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Field id={fieldId} label="What is wrong?" error={error ?? undefined} hint={`${reason.length} of 500 characters`} required>
            <Textarea
              {...fieldA11y(fieldId, error ?? undefined, true)}
              value={reason}
              maxLength={500}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              rows={4}
              placeholder={placeholder}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} Send report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
