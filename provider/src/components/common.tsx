import { ChevronLeft, ChevronRight, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
    </div>
  );
}

export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft /> Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next <ChevronRight />
        </Button>
      </div>
    </div>
  );
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
