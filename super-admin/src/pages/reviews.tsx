import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, EyeOff, Flag, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatRelative } from "@/lib/format";
import type { Paged } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { EmptyState, Pager, PageSkeleton, Stars } from "@/components/common";
import { FilterSelect, SearchInput, StatusBadge, Toolbar, useUrlState } from "@/components/admin-ui";
import { BulkBar, ExportButton, SelectAllBox, SelectRowBox, useSelection } from "@/components/bulk";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ReviewRow {
  id: number;
  rating: number;
  reviewText: string | null;
  providerReply: string | null;
  status: "published" | "flagged" | "removed";
  leadId: number | null;
  createdAt: string;
  user: { id: number; name: string; email: string };
  provider: { id: number; businessName: string; slug: string };
  photos: string[];
  openReports: number;
}

interface FlagRow {
  id: number;
  targetType: "review" | "provider";
  targetId: number;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
  reporter: { id: number; name: string; email: string } | null;
  review: { id: number; rating: number; reviewText: string | null; status: string; provider: { id: number; businessName: string }; user: { name: string } } | null;
  provider: { id: number; businessName: string; city: string; status: string } | null;
}

export function ReviewsPage() {
  const [f, setF] = useUrlState({ tab: "reviews", q: "", status: "", rating: "", page: "1", flagStatus: "open" });
  return (
    <>
      <PageHeader title="Reviews and reports" description="Moderate customer reviews and work through reports about reviews and listings." />
      <Tabs value={f.tab} onValueChange={(tab) => setF({ tab })}>
        <TabsList className="mb-2">
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="reviews">
          <ReviewList f={f} setF={setF} />
        </TabsContent>
        <TabsContent value="reports">
          <ReportList status={f.flagStatus} onStatus={(flagStatus) => setF({ flagStatus })} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function useModerate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ReviewRow["status"] }) => api(`/admin/reviews/${id}`, { method: "PATCH", json: { status } }),
    onSuccess: (_r, v) => {
      toast.success(v.status === "removed" ? "Review hidden" : v.status === "published" ? "Review published" : "Review flagged");
      void qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      void qc.invalidateQueries({ queryKey: ["admin-flags"] });
      void qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

function ReviewList({ f, setF }: { f: Record<"q" | "status" | "rating" | "page", string>; setF: (p: Partial<Record<"q" | "status" | "rating" | "page", string>>) => void }) {
  const params = new URLSearchParams({ pageSize: "15", page: f.page });
  if (f.q) params.set("q", f.q);
  if (f.status) params.set("status", f.status);
  if (f.rating) params.set("rating", f.rating);
  const { data, isLoading } = useQuery({ queryKey: ["admin-reviews", params.toString()], queryFn: () => api<{ reviews: ReviewRow[] } & Paged>(`/admin/reviews?${params}`) });
  const moderate = useModerate();
  const qc = useQueryClient();
  const selection = useSelection(data?.reviews.map((r) => r.id) ?? []);
  const bulk = useMutation({
    mutationFn: (status: "published" | "removed") => api<{ updated: number }>("/admin/reviews/bulk", { method: "POST", json: { ids: selection.selected, status } }),
    onSuccess: ({ updated }, status) => {
      toast.success(`${updated} review${updated === 1 ? "" : "s"} ${status === "removed" ? "hidden" : "published"}`);
      selection.clear();
      void qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      void qc.invalidateQueries({ queryKey: ["admin-flags"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <Toolbar>
        {data && data.reviews.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <SelectAllBox selection={selection} label="Select every review on this page" /> <span className="sm:sr-only">Select all</span>
          </label>
        )}
        <SearchInput value={f.q} onChange={(q) => setF({ q, page: "1" })} placeholder="Search text or business" />
        <FilterSelect
          label="Status"
          allLabel="Any status"
          value={f.status}
          onChange={(status) => setF({ status, page: "1" })}
          options={[
            { value: "published", label: "Published" },
            { value: "flagged", label: "Flagged" },
            { value: "removed", label: "Hidden" },
          ]}
        />
        <FilterSelect label="Rating" allLabel="Any rating" value={f.rating} onChange={(rating) => setF({ rating, page: "1" })} options={[5, 4, 3, 2, 1].map((r) => ({ value: String(r), label: `${r} star${r > 1 ? "s" : ""}` }))} />
        {data && <span className="text-sm text-muted-foreground sm:ml-auto">{data.total.toLocaleString("en-IN")} reviews</span>}
        <ExportButton entity="reviews" filters={{ q: f.q, status: f.status, rating: f.rating }} />
      </Toolbar>
      <BulkBar selection={selection} noun="review">
        <Button size="sm" variant="outline" disabled={bulk.isPending} onClick={() => bulk.mutate("published")}>
          <RotateCcw /> Publish
        </Button>
        <Button size="sm" variant="outline" className="text-destructive" disabled={bulk.isPending} onClick={() => bulk.mutate("removed")}>
          <EyeOff /> Hide
        </Button>
      </BulkBar>
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : !data?.reviews.length ? (
        <EmptyState icon={Flag} title="No reviews match" text="Try a different filter." />
      ) : (
        <div className="space-y-3">
          {data.reviews.map((r) => (
            <article key={r.id} className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <SelectRowBox selection={selection} id={r.id} label={`Select review by ${r.user.name}`} />
                    <Stars rating={r.rating} />
                    <StatusBadge status={r.status} label={r.status === "removed" ? "Hidden" : undefined} />
                    {r.leadId && <span className="text-xs font-medium text-primary">Verified contact</span>}
                    {r.openReports > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                        <Flag className="size-3" /> {r.openReports} open report{r.openReports > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 text-sm">
                    <Link to={`/users/${r.user.id}`} className="font-medium hover:text-primary">
                      {r.user.name}
                    </Link>{" "}
                    <span className="text-muted-foreground">on</span>{" "}
                    <Link to={`/providers/${r.provider.id}`} className="font-medium hover:text-primary">
                      {r.provider.businessName}
                    </Link>
                    <span className="text-muted-foreground"> · {formatRelative(r.createdAt)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {r.status !== "published" && (
                    <Button size="sm" variant="outline" disabled={moderate.isPending} onClick={() => moderate.mutate({ id: r.id, status: "published" })}>
                      <RotateCcw /> Publish
                    </Button>
                  )}
                  {r.status !== "removed" && (
                    <Button size="sm" variant="outline" className="text-destructive" disabled={moderate.isPending} onClick={() => moderate.mutate({ id: r.id, status: "removed" })}>
                      <EyeOff /> Hide
                    </Button>
                  )}
                </div>
              </div>
              {r.reviewText ? <p className="mt-3 whitespace-pre-line text-sm">{r.reviewText}</p> : <p className="mt-3 text-sm italic text-muted-foreground">Rating only, no text</p>}
              {r.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.photos.map((p) => (
                    <a key={p} href={p} target="_blank" rel="noreferrer">
                      <img src={p} alt="Review photo" className="size-16 rounded-lg border object-cover" loading="lazy" />
                    </a>
                  ))}
                </div>
              )}
              {r.providerReply && (
                <div className="mt-3 rounded-xl bg-muted/60 p-3 text-sm">
                  <div className="text-xs font-semibold text-muted-foreground">Reply from the business</div>
                  <p className="mt-1 whitespace-pre-line">{r.providerReply}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={(p) => setF({ page: String(p) })} />}
    </>
  );
}

function ReportList({ status, onStatus }: { status: string; onStatus: (s: string) => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-flags", status], queryFn: () => api<{ flags: FlagRow[] }>(`/admin/flags?status=${status}`) });
  const moderate = useModerate();
  const close = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "resolved" | "dismissed" }) => api(`/admin/flags/${id}`, { method: "PATCH", json: { status } }),
    onSuccess: (_r, v) => {
      toast.success(v.status === "resolved" ? "Report resolved" : "Report dismissed");
      void qc.invalidateQueries({ queryKey: ["admin-flags"] });
      void qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <Toolbar>
        <FilterSelect
          label="Report status"
          allLabel="Open"
          value={status === "open" ? "" : status}
          onChange={(s) => onStatus(s || "open")}
          options={[
            { value: "resolved", label: "Resolved" },
            { value: "dismissed", label: "Dismissed" },
          ]}
        />
      </Toolbar>
      {!data ? (
        <PageSkeleton />
      ) : data.flags.length === 0 ? (
        <EmptyState icon={Flag} title={status === "open" ? "No open reports" : "Nothing here"} text={status === "open" ? "Reports from customers and providers land here." : "Try another status."} />
      ) : (
        <div className="space-y-3">
          {data.flags.map((fl) => (
            <article key={fl.id} className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={fl.targetType === "review" ? "normal" : "high"} label={fl.targetType === "review" ? "Review" : "Listing"} />
                    <span className="text-xs text-muted-foreground">
                      Reported by {fl.reporter?.name ?? "a visitor"} · {formatDate(fl.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{fl.reason}</p>
                </div>
                {fl.status === "open" ? (
                  <div className="flex flex-wrap gap-2">
                    {fl.review && fl.review.status !== "removed" && (
                      <Button size="sm" variant="outline" className="text-destructive" disabled={moderate.isPending} onClick={() => moderate.mutate({ id: fl.review!.id, status: "removed" })}>
                        <EyeOff /> Hide review
                      </Button>
                    )}
                    <Button size="sm" variant="outline" disabled={close.isPending} onClick={() => close.mutate({ id: fl.id, status: "resolved" })}>
                      <Check /> Resolve
                    </Button>
                    <Button size="sm" variant="ghost" disabled={close.isPending} onClick={() => close.mutate({ id: fl.id, status: "dismissed" })}>
                      <X /> Dismiss
                    </Button>
                  </div>
                ) : (
                  <StatusBadge status={fl.status} />
                )}
              </div>
              {fl.review && (
                <div className="mt-3 rounded-xl bg-muted/60 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Stars rating={fl.review.rating} /> by {fl.review.user.name} on{" "}
                    <Link to={`/providers/${fl.review.provider.id}`} className="font-medium text-foreground hover:text-primary">
                      {fl.review.provider.businessName}
                    </Link>
                    {fl.review.status === "removed" && <StatusBadge status="removed" label="Hidden" />}
                  </div>
                  <p className="mt-1 line-clamp-3">{fl.review.reviewText ?? "Rating only"}</p>
                </div>
              )}
              {fl.provider && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-3 text-sm">
                  <span>
                    <span className="font-medium">{fl.provider.businessName}</span> <span className="text-muted-foreground">in {fl.provider.city}</span>
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/providers/${fl.provider.id}`}>Open listing</Link>
                  </Button>
                </div>
              )}
              {!fl.review && !fl.provider && <p className="mt-2 text-xs text-muted-foreground">The reported item no longer exists.</p>}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
