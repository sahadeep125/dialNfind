import type { Metadata } from "next";
import { api } from "@/lib/api";
import { resolveLocation } from "@/lib/location";
import type { Category, SearchResponse } from "@/lib/types";
import { SearchHero } from "@/components/search/search-hero";
import { ResultsSection, one, type SearchParamsRecord } from "@/components/search/results-section";

export const metadata: Metadata = {
  title: "Search local services",
  description: "Search trusted local service providers near you by service, rating, distance and who is open now.",
  alternates: { canonical: "/search" },
  // Result pages are endless combinations of filters; the category pages are the ones to index.
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParamsRecord> }) {
  const sp = await searchParams;
  const location = await resolveLocation(sp);
  const q = one(sp.q) ?? "";
  const radiusParam = Number(one(sp.radius));

  const [data, { categories }] = await Promise.all([
    api<SearchResponse>("/search/providers", {
      query: {
        q,
        category: one(sp.category),
        subcategory: one(sp.sub),
        lat: location.latitude,
        lng: location.longitude,
        location: location.label,
        radiusKm: radiusParam > 0 ? radiusParam : undefined,
        minRating: one(sp.minRating),
        openNow: one(sp.openNow),
        verified: one(sp.verified),
        sort: one(sp.sort),
        page: one(sp.page),
        pageSize: 12,
      },
    }),
    api<{ categories: Category[] }>("/categories"),
  ]);

  const what = data.resolved.subcategory?.name ?? data.resolved.category?.name ?? (q ? q : null);
  const heading = (
    <h2 className="text-base text-muted-foreground">
      <span className="font-bold text-foreground">
        {data.total.toLocaleString("en-IN")} {data.total === 1 ? "pro" : "pros"}
      </span>{" "}
      {what ? `for ${what.toLowerCase()} ` : ""}near {location.label}
    </h2>
  );
  const popular = categories.slice(0, 8).map((c) => ({
    label: c.name,
    href: `/search?${new URLSearchParams({ category: c.slug, lat: String(location.latitude), lng: String(location.longitude), loc: location.label })}`,
  }));

  return (
    <div>
      <SearchHero
        title={what ? `${what} near ${location.label}` : "Find trusted local professionals"}
        subtitle="Compare ratings, reviews and prices, then call or WhatsApp the pro you prefer directly."
        initialQuery={q}
        initialLocation={location}
        popular={popular}
      />
      <ResultsSection
        data={data}
        searchParams={sp}
        basePath="/search"
        heading={heading}
        origin={{ lat: location.latitude, lng: location.longitude }}
        radiusKm={data.radiusKm}
        categories={categories}
        source="search"
      />
    </div>
  );
}
