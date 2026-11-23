import { useState } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CloudOff, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * What a page shows until its data arrives. If a request on the page failed and nothing is loading any
 * more, it shows the error with a Retry button instead, so a failed request never looks like endless loading.
 */
export function PageSkeleton() {
  const qc = useQueryClient();
  const fetching = useIsFetching();
  const failed = fetching
    ? []
    : qc.getQueryCache().findAll({ type: "active", predicate: (q) => q.state.status === "error" && q.state.data === undefined });
  if (failed.length) {
    const error = failed[0].state.error;
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
        <CloudOff className="size-8 text-muted-foreground" />
        <p className="mt-3 font-semibold">This page could not load</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error instanceof Error ? error.message : "Check your connection and try again."}</p>
        <Button className="mt-5" variant="outline" onClick={() => failed.forEach((q) => void qc.refetchQueries({ queryKey: q.queryKey, exact: true }))}>
          Try again
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
    </div>
  );
}

/** The row counts the per-page dropdown offers on every admin listing. */
export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = "25";

/** Reads a page size from URL or state, falling back to the default when it is missing or not one we offer. */
export function pageSizeOf(value: string | number | undefined): number {
  const n = Number(value);
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : Number(DEFAULT_PAGE_SIZE);
}

/**
 * Previous/next paging under a table. Pass `pageSize` and `onPageSize` to also show a "Rows per page" dropdown;
 * the caller should send the admin back to page 1 when it changes.
 */
export function Pager({
  page,
  totalPages,
  onPage,
  pageSize,
  onPageSize,
  total,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  pageSize?: number;
  onPageSize?: (size: number) => void;
  total?: number;
}) {
  const showSize = onPageSize !== undefined && pageSize !== undefined && (total === undefined || total > PAGE_SIZES[0]);
  if (totalPages <= 1 && !showSize) return null;
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span>
          Page {page} of {Math.max(1, totalPages)}
          {total !== undefined && ` · ${total.toLocaleString("en-IN")} total`}
        </span>
        {showSize && (
          <label className="flex items-center gap-2">
            Rows per page
            <Select value={String(pageSize)} onValueChange={(v) => onPageSize?.(Number(v))}>
              <SelectTrigger size="sm" className="w-20" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft /> Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
            Next <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Pages a list the server returns in full (claims, verifications and similar), so it gets the same
 * per-page dropdown as the server-paged tables. Returns the rows to show and the props for `<Pager>`.
 */
export function useClientPager<T>(items: T[] | undefined, resetKey?: unknown) {
  const [pageSize, setPageSize] = useState(Number(DEFAULT_PAGE_SIZE));
  const [rawPage, setPage] = useState(1);
  const [key, setKey] = useState(resetKey);
  if (key !== resetKey) {
    setKey(resetKey);
    setPage(1);
  }
  const all = items ?? [];
  const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
  const page = Math.min(rawPage, totalPages);
  return {
    rows: all.slice((page - 1) * pageSize, page * pageSize),
    pager: {
      page,
      totalPages,
      total: all.length,
      pageSize,
      onPage: setPage,
      onPageSize: (n: number) => {
        setPageSize(n);
        setPage(1);
      },
    },
  };
}

/** Sticky footer with a save button, shown at the bottom of editor pages. */
export function SaveBar({ dirty, saving, onSave, onReset }: { dirty: boolean; saving: boolean; onSave: () => void; onReset?: () => void }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t bg-background/90 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
      <div className="flex items-center justify-end gap-3">
        <span className="mr-auto text-sm text-muted-foreground">{dirty ? "You have unsaved changes" : "All changes saved"}</span>
        {onReset && dirty && (
          <Button type="button" variant="ghost" onClick={onReset} disabled={saving}>
            Discard
          </Button>
        )}
        <Button type="button" onClick={onSave} disabled={!dirty || saving}>
          {saving && <Loader2 className="animate-spin" />} Save changes
        </Button>
      </div>
    </div>
  );
}

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-3.5", i <= Math.round(rating) ? "fill-warning text-warning" : "fill-muted text-muted")} />
      ))}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, text, children }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
        <Icon className="size-6" />
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
