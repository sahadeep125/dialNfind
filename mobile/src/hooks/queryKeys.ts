import type { LocationOption, SearchFilters } from "@/types";

/** Query keys in one place so mutations can invalidate exactly what they change. */
export const queryKeys = {
  categories: ["categories"] as const,
  category: (slug: string) => ["category", slug] as const,
  featured: (location: LocationOption, signedIn: boolean) =>
    ["featured", location.latitude, location.longitude, signedIn] as const,
  search: (filters: SearchFilters, location: LocationOption, signedIn: boolean) =>
    ["search", filters, location.latitude, location.longitude, signedIn] as const,
  suggestions: (q: string) => ["suggestions", q] as const,
  popular: ["popular"] as const,
  provider: (slug: string) => ["provider", slug] as const,
  providerReviews: (slug: string) => ["provider-reviews", slug] as const,
  favorites: ["favorites"] as const,
  myReviews: ["my-reviews"] as const,
  locations: (q: string) => ["locations", q] as const,
  appConfig: ["app-config"] as const,
  me: ["me"] as const,
};
