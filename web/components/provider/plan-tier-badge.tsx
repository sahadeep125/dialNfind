import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Names of badges that come with a plan; the tier badge shows them, so badge lists skip them. */
export const PLAN_BADGES = new Set(["Pro Partner", "Business Partner"]);

/** "Pro Partner" or "Business Partner" next to a provider on a paid plan. */
export function PlanTierBadge({ tier, size = "sm", className }: { tier: "pro" | "business"; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold",
        size === "md" ? "px-2.5 py-0.5 text-xs" : "px-2 py-px text-[11px]",
        tier === "business" ? "bg-[oklch(0.93_0.07_85)] text-[oklch(0.42_0.1_60)] ring-1 ring-[oklch(0.85_0.1_80)]" : "bg-warning-soft text-[oklch(0.45_0.1_60)]",
        className,
      )}
    >
      <Crown className={cn(size === "md" ? "size-3.5" : "size-3", "text-[oklch(0.7_0.15_70)]")} fill="currentColor" aria-hidden />
      {tier === "business" ? "Business Partner" : "Pro Partner"}
    </span>
  );
}
