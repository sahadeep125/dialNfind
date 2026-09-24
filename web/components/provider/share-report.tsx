"use client";

import { useState } from "react";
import { Flag, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { clientApi } from "@/lib/client";

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
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit() {
    setSaving(true);
    try {
      await clientApi(`/providers/${slug}/report`, { method: "POST", body: JSON.stringify({ reason }) });
      toast.success("Thanks. Our team will review this listing.");
      setOpen(false);
      setReason("");
    } catch {
      toast.error("Please describe the problem in a few words");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Flag className="size-3.5" /> Report this listing
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this listing</DialogTitle>
          <DialogDescription>Wrong number, closed business, or something unsafe? Tell us and we will check it.</DialogDescription>
        </DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="What is wrong with this listing?" />
        <DialogFooter>
          <Button onClick={submit} disabled={saving || reason.trim().length < 5}>
            {saving && <Loader2 className="animate-spin" />} Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
