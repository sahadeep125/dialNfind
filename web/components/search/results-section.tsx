import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Category, SearchResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ProviderCard } from "@/components/provider/provider-card";
import { EmptyResultsIllustration } from "@/components/illustrations/spots";
import { cn } from "@/lib/utils";
import { FiltersSidebar } from "./filters";
import { ResultsToolbar } from "./results-toolbar";
import { ResultsMapLoader } from "./results-map-loader";

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function ResultsSection({
  data,
  searchParams,
  basePath,
  heading,
  origin,
  radiusKm,
  categories,
  lockedCategory,
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
  source: "search" | "category_browse";
}) {
  const view = one(searchParams.view) === "map" ? "map" : "list";
  const highlight = data.resolved.subcategory?.name;

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <FiltersSidebar categories={categories} lockedCategory={lockedCategory} defaultRadius={data.radiusKm} />
      <div className="min-w-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">{heading}</div>
          <ResultsToolbar categories={categories} lockedCategory={lockedCategory} defaultRadius={data.radiusKm} />
        </div>

        {data.results.length === 0 ? (
          <EmptyState basePath={basePath} />
        ) : view === "map" ? (
          <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_22rem]">
            <div className="h-[60vh] min-h-[420px] overflow-hidden rounded-2xl border shadow-[var(--shadow-soft)] xl:h-[calc(100dvh-12rem)]">
              <ResultsMapLoader providers={data.results} origin={origin} radiusKm={radiusKm} />
            </div>
            <div className="space-y-3 xl:max-h-[calc(100dvh-12rem)] xl:overflow-y-auto xl:pr-1">
              {data.results.map((p) => (
                <ProviderCard key={p.id} provider={p} source={source} highlight={highlight} className="p-4" />
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {data.results.map((p) => (
              <ProviderCard key={p.id} provider={p} source={source} highlight={highlight} />
            ))}
          </div>
        )}

        {data.totalPages > 1 && <Pagination page={data.page} totalPages={data.totalPages} searchParams={searchParams} basePath={basePath} />}
      </div>
    </div>
  );
}

function hrefFor(basePath: string, searchParams: SearchParamsRecord, changes: Record<string, string | null>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    const val = one(v);
    if (val) qs.set(k, val);
  }
  for (const [k, v] of Object.entries(changes)) {
    if (v === null) qs.delete(k);
    else qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

function Pagination({ page, totalPages, searchParams, basePath }: { page: number; totalPages: number; searchParams: SearchParamsRecord; basePath: string }) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);
  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
      <Button asChild variant="outline" size="icon" className={cn(page <= 1 && "pointer-events-none opacity-40")}>
        <Link href={hrefFor(basePath, searchParams, { page: String(page - 1) })} aria-label="Previous page">
          <ChevronLeft />
        </Link>
      </Button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-muted-foreground">...</span>}
          <Button asChild variant={p === page ? "default" : "outline"} size="icon">
            <Link href={hrefFor(basePath, searchParams, { page: p === 1 ? null : String(p) })}>{p}</Link>
          </Button>
        </span>
      ))}
      <Button asChild variant="outline" size="icon" className={cn(page >= totalPages && "pointer-events-none opacity-40")}>
        <Link href={hrefFor(basePath, searchParams, { page: String(page + 1) })} aria-label="Next page">
          <ChevronRight />
        </Link>
      </Button>
    </nav>
  );
}

function EmptyState({ basePath }: { basePath: string }) {
  return (
    <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
      <EmptyResultsIllustration className="w-48" />
      <h3 className="mt-6 text-xl font-bold">No providers match yet</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Try increasing the distance, removing a filter, or searching a nearby area. New providers join every week.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline">
          <Link href={`${basePath}`}>Clear all filters</Link>
        </Button>
        <Button asChild>
          <Link href="/services">Browse all services</Link>
        </Button>
      </div>
    </div>
  );
}
