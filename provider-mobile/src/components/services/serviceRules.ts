// Price rules and labels for the services editor. Limits match server/src/routes/provider/shared.ts.

import type { PriceUnit, ProviderService, SelectOption } from "@/types";

export const MAX_PRICE = 1_000_000;

export const PRICE_UNIT_OPTIONS: SelectOption<PriceUnit>[] = [
  { value: "per_visit", label: "Per visit" },
  { value: "per_hour", label: "Per hour" },
  { value: "fixed", label: "Fixed / starting" },
];

/** Error for a price typed as text, or null when it is empty or valid. */
export function priceError(text: string): string | null {
  const v = text.trim();
  if (!v) return null;
  if (!/^\d+$/.test(v)) return "Use whole rupees, digits only";
  if (Number(v) > MAX_PRICE) return "Keep the price under Rs 10,00,000";
  return null;
}

export function serviceKey(s: { categoryId: number | null; subcategoryId: number | null }): string {
  return `${s.categoryId ?? ""}:${s.subcategoryId ?? ""}`;
}

export function serviceName(s: ProviderService): string {
  return s.subcategory?.name ?? s.category?.name ?? "Service";
}
