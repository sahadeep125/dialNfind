// Individual professionals first: an account is either a person listed under their own name, with one
// listing per profession ("Deep Saha – Plumber – Ghoraguli"), or a business with one listing
// ("ABC Services – Plumbing & Electrical – Siliguri"). The words match the provider website.

import type { OwnListing, Profession } from "@/types";
import type { BusinessType } from "@/types/onboarding";

export const ACCOUNT_TYPES: Record<
  BusinessType,
  { label: string; text: string; nameLabel: string; namePlaceholder: string }
> = {
  individual: {
    label: "Individual professional",
    text: "You do the work yourself: plumber, electrician, tutor, driver. Listed under your own name, one listing per profession.",
    nameLabel: "Your full name",
    namePlaceholder: "e.g. Deep Saha",
  },
  company: {
    label: "Business",
    text: "A shop, service centre, agency or team. One listing for the business.",
    nameLabel: "Business name",
    namePlaceholder: "e.g. ABC Services",
  },
};

/** A profession's key in the picker: its category and service. */
export const professionKey = (p: Pick<Profession, "categoryId" | "subcategoryId">): string =>
  `${p.categoryId}:${p.subcategoryId ?? ""}`;

/** "Deep Saha – Plumber – Ghoraguli", or "ABC Services – Plumbing – Siliguri" for a business. */
export function listingTitle(l: OwnListing): string {
  const middle =
    l.businessType === "individual" ? l.professionLabel : (l.primaryCategory?.name ?? null);
  return [l.businessName, middle, l.locality?.trim() || l.city].filter(Boolean).join(" – ");
}

/** Professions matching a search, by title, category or service. */
export function filterProfessions(list: Profession[], query: string): Profession[] {
  const term = query.trim().toLowerCase();
  if (!term) return list;
  return list.filter((p) =>
    `${p.label} ${p.categoryName} ${p.subcategoryName ?? ""}`.toLowerCase().includes(term),
  );
}
