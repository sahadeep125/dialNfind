import { Building2, UserRound } from "lucide-react";
import type { AccountType } from "@/lib/account-type";
import { cn } from "@/lib/utils";

/**
 * Tells customers at a glance who they are hiring: an individual professional (a person, orange) or a
 * business (a building, blue). The mobile apps use the same icons, words and colours.
 */
export function AccountTypeBadge({ type, size = "sm", className }: { type: AccountType; size?: "sm" | "md"; className?: string }) {
  const individual = type === "individual";
  const Icon = individual ? UserRound : Building2;
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-md font-semibold",
        size === "md" ? "px-2.5 py-1 text-[13px]" : "px-2 py-0.5 text-xs",
        individual ? "bg-cta-soft text-cta-strong" : "bg-accent text-accent-foreground",
        className,
      )}
    >
      <Icon className={size === "md" ? "size-4" : "size-3.5"} aria-hidden />
      {individual ? "Individual professional" : "Business"}
    </span>
  );
}
