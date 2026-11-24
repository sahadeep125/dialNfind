import { Building2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export type BusinessType = "individual" | "company";

/** The words the portal uses for each account type. */
export const ACCOUNT_TYPES: Record<BusinessType, { label: string; short: string; nameLabel: string; namePlaceholder: string }> = {
  individual: { label: "Individual professional", short: "Individual", nameLabel: "Your full name", namePlaceholder: "e.g. Deep Saha" },
  company: { label: "Business", short: "Business", nameLabel: "Business name", namePlaceholder: "e.g. ABC Services" },
};

/** "Individual professional" or "Business", with the same icons and colours the website and apps use. */
export function AccountTypeBadge({ type, className }: { type: BusinessType; className?: string }) {
  const individual = type === "individual";
  const Icon = individual ? UserRound : Building2;
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        individual ? "bg-brand-accent-soft text-brand-accent-strong" : "bg-accent text-accent-foreground",
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {individual ? "Individual professional" : "Business"}
    </span>
  );
}

/** "Deep Saha – Plumber – Ghoraguli" or "ABC Services – Siliguri". */
export function listingTitle(l: { businessName: string; professionLabel?: string | null; locality?: string | null; city?: string }) {
  return [l.businessName, l.professionLabel, l.locality || l.city].filter(Boolean).join(" – ");
}
