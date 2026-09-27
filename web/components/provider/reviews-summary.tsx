import { Star } from "lucide-react";
import type { ProviderDetail } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { RatingStars } from "./rating";

/** Average rating beside a bar per star level. */
export function ReviewsSummary({ p }: { p: Pick<ProviderDetail, "avgRating" | "totalReviews" | "ratingBreakdown"> }) {
  const total = p.ratingBreakdown.reduce((sum, b) => sum + b.count, 0);
  const breakdown = [...p.ratingBreakdown].sort((a, b) => b.rating - a.rating);
  return (
    <div className="flex flex-col gap-6 rounded-lg border bg-card p-5 sm:flex-row sm:items-center">
      <div className="shrink-0 sm:w-40 sm:border-r sm:pr-6">
        <div className="text-5xl font-extrabold leading-none tracking-tight">{p.avgRating.toFixed(1)}</div>
        <RatingStars value={p.avgRating} size="md" className="mt-2" />
        <div className="mt-1.5 text-sm text-muted-foreground">
          {p.totalReviews.toLocaleString("en-IN")} {p.totalReviews === 1 ? "review" : "reviews"}
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {breakdown.map((b) => {
          const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
          return (
            <div key={b.rating} className="flex items-center gap-3 text-sm">
              <span className="flex w-7 items-center gap-0.5 font-medium">
                {b.rating}
                <Star className="size-3 text-star" fill="currentColor" strokeWidth={0} aria-hidden />
              </span>
              <Progress value={pct} indicatorClassName="bg-star" className="h-2 bg-muted" aria-label={`${b.rating} stars: ${pct}%`} />
              <span className="w-9 text-right text-muted-foreground">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
