import Link from "next/link";
import { BadgeCheck, Quote } from "lucide-react";
import { publicApi } from "@/lib/api";
import type { ReviewHighlight } from "@/lib/types";
import { SectionHeading } from "@/components/site/section-heading";
import { RatingStars } from "@/components/provider/rating";

async function highlights(): Promise<ReviewHighlight[]> {
  try {
    const { reviews } = await publicApi<{ reviews: ReviewHighlight[] }>("/reviews/highlights", { query: { limit: 3 }, revalidate: 3600, tags: ["reviews"] });
    return reviews;
  } catch {
    return [];
  }
}

/** Recent real reviews from customers; the section is left out until there are some. */
export async function Testimonials() {
  const reviews = await highlights();
  if (reviews.length === 0) return null;
  return (
    <section className="section-y border-y bg-card">
      <div className="container-page">
        <SectionHeading eyebrow="Customer reviews" title="What people say about local pros" />
        <ul className="mt-8 grid gap-5 md:grid-cols-3">
          {reviews.map((r) => (
            <li key={r.id} className="flex flex-col rounded-lg border bg-background p-6">
              <div className="flex items-center justify-between">
                <RatingStars value={r.rating} size="md" />
                <Quote className="size-6 text-border" aria-hidden />
              </div>
              <blockquote className="mt-4 line-clamp-5 flex-1 text-[15px] leading-relaxed text-foreground/85">{r.reviewText}</blockquote>
              <div className="mt-5 border-t pt-4 text-sm">
                <div className="flex items-center gap-1.5 font-semibold">
                  {r.authorName}
                  {r.isVerifiedContact && <BadgeCheck className="size-4 text-success" aria-label="Verified contact" />}
                </div>
                <div className="mt-0.5 text-muted-foreground">
                  about{" "}
                  <Link href={`/providers/${r.provider.slug}`} className="font-medium text-primary hover:underline">
                    {r.provider.businessName}
                  </Link>
                  {r.provider.category ? `, ${r.provider.category.name.toLowerCase()} in ${r.provider.city}` : ` in ${r.provider.city}`}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
