import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** The current URL with some query values changed (null removes one). */
export function hrefFor(basePath: string, searchParams: SearchParamsRecord, changes: Record<string, string | null>) {
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

/** Page 1 and the last page, plus the pages next to the current one. */
export function visiblePages(page: number, totalPages: number): number[] {
  return Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);
}

/** Numbered page links. Previous and Next are plain text on the first and last page, so they cannot be focused. */
export function Pagination({ page, totalPages, searchParams, basePath }: { page: number; totalPages: number; searchParams: SearchParamsRecord; basePath: string }) {
  if (totalPages <= 1) return null;
  const pages = visiblePages(page, totalPages);
  const href = (p: number) => hrefFor(basePath, searchParams, { page: p === 1 ? null : String(p) });
  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 ? (
        <Button asChild variant="outline" size="icon">
          <Link href={href(page - 1)} aria-label="Previous page" rel="prev">
            <ChevronLeft />
          </Link>
        </Button>
      ) : (
        <span aria-disabled="true" className="flex size-9 items-center justify-center rounded-lg border text-muted-foreground opacity-40">
          <ChevronLeft className="size-4" aria-hidden />
          <span className="sr-only">Previous page</span>
        </span>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && pages[i - 1] !== p - 1 && (
            <span className="px-1 text-muted-foreground" aria-hidden>
              ...
            </span>
          )}
          <Button asChild variant={p === page ? "default" : "outline"} size="icon">
            <Link href={href(p)} aria-label={`Page ${p}`} aria-current={p === page ? "page" : undefined}>
              {p}
            </Link>
          </Button>
        </span>
      ))}
      {page < totalPages ? (
        <Button asChild variant="outline" size="icon">
          <Link href={href(page + 1)} aria-label="Next page" rel="next">
            <ChevronRight />
          </Link>
        </Button>
      ) : (
        <span aria-disabled="true" className="flex size-9 items-center justify-center rounded-lg border text-muted-foreground opacity-40">
          <ChevronRight className="size-4" aria-hidden />
          <span className="sr-only">Next page</span>
        </span>
      )}
    </nav>
  );
}
