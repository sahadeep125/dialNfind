"use client";

import { useState } from "react";
import Image from "next/image";
import { BadgeCheck, Loader2, MessageSquareReply, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clientApi } from "@/lib/client";
import { isOptimizableImage } from "@/lib/image-hosts";
import { formatRelative, initials } from "@/lib/format";
import type { Paged, Review } from "@/lib/types";
import { ReportReview } from "./share-report";

export function ReviewsList({ slug, initial, providerName, pageSize = 6 }: { slug: string; initial: { reviews: Review[] } & Paged; providerName: string; pageSize?: number }) {
  const [reviews, setReviews] = useState(initial.reviews);
  const [page, setPage] = useState(initial.page);
  const [totalPages, setTotalPages] = useState(initial.totalPages);
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<number | null>(null);

  async function load(nextPage: number, nextSort = sort) {
    setLoading(true);
    setFailed(null);
    try {
      const data = await clientApi<{ reviews: Review[] } & Paged>(`/providers/${slug}/reviews?page=${nextPage}&pageSize=${pageSize}&sort=${nextSort}`);
      setReviews((prev) => (nextPage === 1 ? data.reviews : [...prev, ...data.reviews]));
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch {
      setFailed(nextPage);
    } finally {
      setLoading(false);
    }
  }

  if (initial.total === 0) {
    return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No reviews yet. Be the first to share your experience.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">Recent reviews</p>
        <Select
          value={sort}
          onValueChange={(v) => {
            setSort(v);
            void load(1, v);
          }}
        >
          <SelectTrigger size="sm" className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="recent">Most recent</SelectItem>
            <SelectItem value="highest">Highest rated</SelectItem>
            <SelectItem value="lowest">Lowest rated</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ul className="divide-y">
        {reviews.map((r) => (
          <li key={r.id} className="py-4 first:pt-1">
            <div className="flex items-start gap-3">
              <Avatar className="size-10">
                {r.author.photoUrl && <AvatarImage src={r.author.photoUrl} alt="" className="object-cover" />}
                <AvatarFallback>{initials(r.author.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
                    <span className="truncate font-semibold">{r.author.name}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[oklch(0.68_0.16_70)]">
                      {r.rating} <Star className="size-3.5" fill="currentColor" strokeWidth={0} aria-label="stars" />
                    </span>
                    <span className="text-xs text-muted-foreground">{formatRelative(r.createdAt)}</span>
                  </div>
                  {r.isVerifiedContact && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-[oklch(0.42_0.1_165)]">
                      <BadgeCheck className="size-3" /> Verified Contact
                    </span>
                  )}
                </div>
                {r.reviewText && <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">{r.reviewText}</p>}
                {r.photos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.photos.map((url, i) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="relative block size-16 overflow-hidden rounded-lg border bg-muted">
                        <Image
                          src={url}
                          alt={`Photo ${i + 1} from ${r.author.name}`}
                          fill
                          sizes="64px"
                          className="object-cover transition-transform hover:scale-105"
                          unoptimized={!isOptimizableImage(url)}
                        />
                      </a>
                    ))}
                  </div>
                )}
                {r.providerReply && (
                  <div className="mt-3 rounded-lg border-l-2 border-primary/40 bg-muted/70 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <MessageSquareReply className="size-3.5 text-primary" /> Reply from {providerName}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{r.providerReply}</p>
                  </div>
                )}
                <div className="mt-2 flex justify-end text-xs text-muted-foreground">
                  <ReportReview reviewId={r.id} />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {failed !== null && (
        <p role="alert" className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-destructive">
          Could not load reviews.
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => void load(failed)}>
            Try again
          </Button>
        </p>
      )}
      {page < totalPages && (
        <Button variant="outline" className="mt-4 w-full" onClick={() => load(page + 1)} disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Show more reviews
        </Button>
      )}
    </div>
  );
}
