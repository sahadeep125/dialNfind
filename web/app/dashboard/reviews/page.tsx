import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareReply, PenLine } from "lucide-react";
import { api } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/provider/rating";
import { DeleteReviewButton } from "@/components/dashboard/my-review-actions";

export const metadata: Metadata = { title: "My reviews" };

interface MyReview {
  id: number;
  rating: number;
  reviewText: string | null;
  providerReply: string | null;
  status: string;
  createdAt: string;
  provider: { id: number; slug: string; businessName: string; city: string; locality: string | null };
}

export default async function MyReviewsPage() {
  await requireSession("/dashboard/reviews");
  const { reviews } = await api<{ reviews: MyReview[] }>("/me/reviews");
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-deep">My reviews</h1>
      <p className="mt-1 text-muted-foreground">Reviews you have shared. You can edit them from the provider page.</p>
      <div className="mt-6 space-y-4">
        {reviews.length === 0 && <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">You have not written any reviews yet.</p>}
        {reviews.map((r) => (
          <article key={r.id} className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/providers/${r.provider.slug}`} className="font-semibold hover:text-primary">
                  {r.provider.businessName}
                </Link>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <RatingStars value={r.rating} /> {formatDate(r.createdAt)} · {r.provider.locality ?? r.provider.city}
                </div>
              </div>
              <div className="flex gap-1">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/providers/${r.provider.slug}#reviews`}>
                    <PenLine /> Edit
                  </Link>
                </Button>
                <DeleteReviewButton id={r.id} />
              </div>
            </div>
            {r.reviewText && <p className="mt-3 text-sm leading-relaxed">{r.reviewText}</p>}
            {r.providerReply && (
              <div className="mt-3 rounded-xl bg-muted/70 p-3 text-sm">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <MessageSquareReply className="size-3.5 text-primary" /> Provider reply
                </div>
                <p className="mt-1 text-muted-foreground">{r.providerReply}</p>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
