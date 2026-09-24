"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, PenLine, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { clientApi, ClientApiError } from "@/lib/client";
import { cn } from "@/lib/utils";

const LABELS = ["", "Poor", "Below average", "Good", "Very good", "Excellent"];

export function ReviewForm({
  providerId,
  providerName,
  signedIn,
  existing,
}: {
  providerId: number;
  providerName: string;
  signedIn: boolean;
  existing: { id: number; rating: number; reviewText: string | null } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState(existing?.reviewText ?? "");
  const [saving, setSaving] = useState(false);

  if (!signedIn) {
    return (
      <Button variant="outline" onClick={() => router.push(`/login?next=${encodeURIComponent(pathname)}`)}>
        <PenLine /> Write a review
      </Button>
    );
  }

  async function submit() {
    if (!rating) {
      toast.error("Pick a star rating");
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        await clientApi(`/reviews/${existing.id}`, { method: "PATCH", body: JSON.stringify({ rating, reviewText: text }) });
      } else {
        await clientApi("/reviews", { method: "POST", body: JSON.stringify({ providerId, rating, reviewText: text }) });
      }
      toast.success(existing ? "Review updated" : "Thanks for sharing your experience");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not save your review");
    } finally {
      setSaving(false);
    }
  }

  const shown = hover || rating;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PenLine /> {existing ? "Edit your review" : "Write a review"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit your review" : `Review ${providerName}`}</DialogTitle>
          <DialogDescription>Honest reviews help your neighbours pick the right professional.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Your rating</Label>
          <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} type="button" onMouseEnter={() => setHover(i)} onClick={() => setRating(i)} className="cursor-pointer p-0.5" aria-label={`${i} stars`}>
                <Star className={cn("size-8 transition-colors", i <= shown ? "fill-warning text-warning" : "text-[oklch(0.88_0.02_85)]")} strokeWidth={1.5} />
              </button>
            ))}
            <span className="ml-2 text-sm font-medium text-muted-foreground">{LABELS[shown]}</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="review-text">Your experience</Label>
          <Textarea
            id="review-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="What did they fix? Were they on time? Was the price fair?"
          />
          <p className="text-xs text-muted-foreground">At least 10 characters. Do not share personal phone numbers or addresses.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} {existing ? "Save changes" : "Post review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
