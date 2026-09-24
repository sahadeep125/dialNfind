"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Phone, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clientApi } from "@/lib/client";
import { formatRelative } from "@/lib/format";
import type { ContactHistoryItem } from "@/lib/types";
import { ProviderAvatar } from "@/components/provider/provider-avatar";
import { RatingPill } from "@/components/provider/rating";

/** One past contact, with the "Did they respond?" follow-up that feeds the provider's response signal. */
export function ContactRow({ item }: { item: ContactHistoryItem }) {
  const [responded, setResponded] = useState(item.customerReportedResponse);

  async function answer(value: boolean) {
    setResponded(value);
    try {
      await clientApi(`/leads/${item.id}/response`, { method: "PATCH", body: JSON.stringify({ responded: value }) });
      toast.success("Thanks, this helps rank providers fairly");
    } catch {
      setResponded(item.customerReportedResponse);
      toast.error("Could not save your answer");
    }
  }

  const p = item.provider;
  const Icon = item.channel === "call" ? Phone : MessageCircle;
  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <ProviderAvatar name={p.businessName} logoUrl={p.logoUrl} categorySlug={p.primaryCategory?.slug} className="size-12" />
        <div className="min-w-0">
          <Link href={`/providers/${p.slug}`} className="block truncate font-semibold hover:text-primary">
            {p.businessName}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Icon className="size-3.5" /> {item.channel === "call" ? "Called" : "WhatsApp"} {formatRelative(item.createdAt)}
            </span>
            <RatingPill value={p.avgRating} count={p.totalReviews} className="text-xs" />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {responded === null ? (
          <>
            <span className="text-sm text-muted-foreground">Did they respond?</span>
            <Button size="sm" variant="outline" onClick={() => answer(true)}>
              <ThumbsUp /> Yes
            </Button>
            <Button size="sm" variant="outline" onClick={() => answer(false)}>
              <ThumbsDown /> No
            </Button>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">{responded ? "They responded" : "No response"}</span>
        )}
        {!item.hasReview && (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/providers/${p.slug}#reviews`}>Write review</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
