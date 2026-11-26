import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder while a page's data loads (used by the loading.tsx files). */
export function ListingSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      {/* The paper header, closed by the ink rule, as on the loaded page. */}
      <div className="border-b-[1.5px] border-ink-rule">
        <div className="container-wide py-7 md:py-10">
          <Skeleton className="h-10 w-[28rem] max-w-full" />
          <Skeleton className="mt-3 h-5 w-96 max-w-full" />
          <Skeleton className="mt-6 h-[4.5rem] w-full max-w-5xl rounded-lg" />
        </div>
      </div>
      <div className="border-b">
        <div className="container-wide flex gap-2 py-2.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-full" />
          ))}
        </div>
      </div>
      <div className="container-wide grid gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_38%] xl:grid-cols-[minmax(0,1fr)_40%]">
        <div className="space-y-4">
          <Skeleton className="h-6 w-72" />
          {/* Rail stops: a distance on the left, a card beside it. */}
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-4 pl-8">
              <Skeleton className="mt-4 h-8 w-14" />
              <Skeleton className="h-40 rounded-lg" />
            </div>
          ))}
        </div>
        <Skeleton className="hidden h-[calc(100dvh-6rem)] rounded-lg lg:block" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      {/* The navy signboard, then the page body. */}
      <div className="bg-board">
        <div className="container-wide pb-10 pt-4">
          <Skeleton className="h-5 w-64 max-w-full bg-white/10" />
          <Skeleton className="mt-8 h-7 w-56 rounded-sm bg-cta/40" />
          <div className="mt-4 flex gap-5">
            <Skeleton className="size-16 shrink-0 rounded-lg bg-white/15 sm:size-24" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-12 w-[28rem] max-w-full bg-white/15" />
              <Skeleton className="h-5 w-64 max-w-full bg-white/10" />
            </div>
          </div>
          <Skeleton className="mt-8 h-24 w-[40rem] max-w-full bg-white/10" />
        </div>
      </div>
      <div className="container-wide grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-5">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-52 rounded-lg" />
          <Skeleton className="h-44 rounded-lg" />
        </div>
        <Skeleton className="hidden h-96 rounded-lg lg:block" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  );
}
