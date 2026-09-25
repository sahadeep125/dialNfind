import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { resolveLocation } from "@/lib/location";
import type { Category, SearchResponse } from "@/lib/types";
import { SearchBar } from "@/components/search/search-bar";
import { ResultsSection, one, type SearchParamsRecord } from "@/components/search/results-section";
import { CategoryIcon } from "@/components/site/category-icon";

export const metadata: Metadata = { title: "Search local services" };

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

  const what = data.resolved.subcategory?.name ?? data.resolved.category?.name ?? (q ? `"${q}"` : "service");
  const heading = (
    <div>
      <h1 className="text-2xl font-bold text-brand-deep md:text-3xl">
        {data.total.toLocaleString("en-IN")} {what === "service" ? "service providers" : `${what} providers`}
      </h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="size-4 text-primary" /> within {data.radiusKm} km of {location.label}
      </p>
    </div>
  );

  return (
    <div>
      <section className="border-b bg-[linear-gradient(180deg,oklch(0.965_0.02_266),transparent)]">
        <div className="container-page py-8">
          <SearchBar initialQuery={q} initialLocation={location} size="md" />
          {!q && !one(sp.category) && !one(sp.sub) && (
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/search?${new URLSearchParams({ category: c.slug, lat: String(location.latitude), lng: String(location.longitude), loc: location.label })}`}
                  className="flex shrink-0 items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3.5 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <CategoryIcon slug={c.slug} className="size-7 rounded-full" iconClassName="size-3.5" />
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <div className="container-page py-8">
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
    </div>
  );
}
