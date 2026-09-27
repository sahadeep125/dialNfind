import Link from "next/link";
import { SearchX } from "lucide-react";
import type { Category, SearchResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ProviderCard } from "@/components/provider/provider-card";
import { Pagination } from "@/components/pagination";
import { FilterBar } from "./filter-bar";
import { MapViewButton, SortSelect } from "./results-toolbar";
import { ResultsMapLoader } from "./results-map-loader";
import { ResultHover, ResultsHoverProvider } from "./results-hover";

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Filter bar, then the result list beside a sticky map (or the map full width with `view=map`). */
export function ResultsSection({
  data,
  searchParams,
  basePath,
  heading,
  origin,
  radiusKm,
  categories,
  lockedCategory,
  lockedSub,
  source,
}: {
  data: SearchResponse;
  searchParams: SearchParamsRecord;
  basePath: string;
  heading: React.ReactNode;
  origin: { lat: number; lng: number } | null;
  radiusKm: number;
  categories?: Category[];
  lockedCategory?: Category;
  /** On a subcategory page: its slug, which is part of the path rather than a filter. */
  lockedSub?: string;
  source: "search" | "category_browse";
}) {
  const view = one(searchParams.view) === "map" ? "map" : "list";
  const highlight = data.resolved.subcategory?.name;
  const sort = one(searchParams.sort);
  const bestFirst = data.page === 1 && (!sort || sort === "relevance") && data.results.length > 1;
  const empty = data.results.length === 0;

  const list = (
    <div className="space-y-4">
      {data.results.map((p, i) => (
        <ResultHover key={p.id} id={p.id}>
          <ProviderCard provider={p} source={source} highlight={highlight} topMatch={bestFirst && i === 0} />
        </ResultHover>
      ))}
    </div>
  );

  return (
    <ResultsHoverProvider>
      <FilterBar categories={categories} lockedCategory={lockedCategory} lockedSub={lockedSub} defaultRadius={data.radiusKm} />
      <div className="container-wide pt-5">
        {view === "map" && !empty ? (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">{heading}</div>
              <SortSelect />
            </div>
            <div role="region" aria-label="Map of results; the same providers are listed below it" className="relative h-[65dvh] min-h-[420px] overflow-hidden rounded-lg border">
              <ResultsMapLoader providers={data.results} origin={origin} radiusKm={radiusKm} />
              <div className="absolute right-3 top-3 z-20">
                <MapViewButton view="map" variant="overlay" />
              </div>
            </div>
            <div className="mt-5">{list}</div>
            <Pagination page={data.page} totalPages={data.totalPages} searchParams={searchParams} basePath={basePath} />
          </>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_36%] xl:grid-cols-[minmax(0,1fr)_38%]">
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">{heading}</div>
                <SortSelect />
              </div>
              {empty ? <EmptyState basePath={basePath} /> : list}
              <Pagination page={data.page} totalPages={data.totalPages} searchParams={searchParams} basePath={basePath} />
            </div>
            {!empty && (
              <div className="hidden lg:block">
                {/* Sits below the header and the sticky filter bar. */}
                <div role="region" aria-label="Map of results; the same providers are listed beside it" className="sticky top-[8.5rem] h-[calc(100dvh-10rem)] overflow-hidden rounded-lg border">
                  <ResultsMapLoader providers={data.results} origin={origin} radiusKm={radiusKm} />
                  <div className="absolute right-3 top-3 z-20">
                    <MapViewButton view="list" variant="overlay" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {!empty && (
        <div className="fixed inset-x-0 bottom-5 z-30 flex justify-center lg:hidden">
          <MapViewButton view={view} variant="floating" />
        </div>
      )}
    </ResultsHoverProvider>
  );
}

function EmptyState({ basePath }: { basePath: string }) {
  return (
    <div className="mt-2 flex flex-col items-center rounded-lg border border-dashed bg-card px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="size-7" aria-hidden />
      </span>
      <h3 className="mt-5 text-xl font-bold">No providers match yet</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Try increasing the distance, removing a filter, or searching a nearby area. New providers join every week.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline">
          <Link href={`${basePath}`}>Clear all filters</Link>
        </Button>
        <Button asChild variant="cta">
          <Link href="/services">Browse all services</Link>
        </Button>
      </div>
    </div>
  );
}
