import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({ value, size = "sm", className }: { value: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const px = size === "lg" ? "size-5" : size === "md" ? "size-4" : "size-3.5";
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className={cn("relative inline-block", px)}>
            <Star className={cn("absolute inset-0 text-[oklch(0.88_0.02_85)]", px)} fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn("text-warning", px)} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function RatingPill({ value, count, className }: { value: number; count: number; className?: string }) {
  if (!count) {
    return <span className={cn("text-xs font-medium text-muted-foreground", className)}>New listing</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <span className="inline-flex items-center gap-1 rounded-md bg-[oklch(0.55_0.13_160)] px-1.5 py-0.5 text-xs font-bold text-white">
        {value.toFixed(1)}
        <Star className="size-3" fill="currentColor" strokeWidth={0} />
      </span>
      <span className="text-muted-foreground">
        {count.toLocaleString("en-IN")} {count === 1 ? "review" : "reviews"}
      </span>
    </span>
  );
}
