// Who a listing is: an individual professional ("Deep Saha – Plumber – Ghoraguli") or a business
// ("ABC Services – Plumbing & Electrical – Siliguri"). Matches web/lib/account-type.ts.

import type { ProviderCard } from "@/types";

export const isIndividual = (p: Pick<ProviderCard, "businessType">): boolean =>
  p.businessType === "individual";

/** The middle and last parts of a listing's name line: profession or categories, then area. */
export function listingLine(
  p: Pick<
    ProviderCard,
    | "businessType"
    | "profession"
    | "categoryLabel"
    | "serviceAreaLabel"
    | "locality"
    | "city"
    | "primaryCategory"
  >,
): { middle: string | null; area: string } {
  const middle =
    (isIndividual(p) ? p.profession : null) ?? p.categoryLabel ?? p.primaryCategory?.name ?? null;
  return { middle, area: p.serviceAreaLabel ?? (p.locality?.trim() || p.city) };
}

/** The search filter that shows only individual professionals or only businesses. */
export const ACCOUNT_FILTERS: { value: "individual" | "business" | undefined; label: string }[] = [
  { value: undefined, label: "Everyone" },
  { value: "individual", label: "Individual professionals" },
  { value: "business", label: "Businesses" },
];

export function accountChipLabel(value: "individual" | "business" | undefined): string {
  return value === "individual" ? "Individuals" : value === "business" ? "Businesses" : "Who";
}
