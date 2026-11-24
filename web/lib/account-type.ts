import type { ProviderCard } from "./types";

export type AccountType = "individual" | "company";

export const isIndividual = (p: { businessType: AccountType }) => p.businessType === "individual";

/**
 * The three parts every listing is known by. An individual professional: "Deep Saha – Plumber – Ghoraguli".
 * A business: "ABC Services – Plumbing & Electrical – Siliguri".
 */
export function listingParts(p: Pick<ProviderCard, "businessName" | "businessType" | "profession" | "categoryLabel" | "serviceAreaLabel" | "locality" | "city" | "primaryCategory">) {
  const middle = (isIndividual(p) ? p.profession : null) ?? p.categoryLabel ?? p.primaryCategory?.name ?? null;
  return { name: p.businessName, middle, area: p.serviceAreaLabel ?? (p.locality || p.city) };
}

/** The search filter (?type=) that shows only individual professionals or only businesses. */
export const ACCOUNT_FILTERS = [
  { value: "", label: "Everyone" },
  { value: "individual", label: "Individual professionals" },
  { value: "business", label: "Businesses" },
] as const;
