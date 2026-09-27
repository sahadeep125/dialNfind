import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder while a page's data loads (used by the loading.tsx files). */
export function ListingSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <div className="bg-brand-deep">
        <div className="container-wide py-8 md:py-10">
          <Skeleton className="h-9 w-80 max-w-full bg-white/10" />
          <Skeleton className="mt-3 h-5 w-96 max-w-full bg-white/10" />
          <Skeleton className="mt-6 h-12 w-full max-w-5xl bg-white/10" />
        </div>
      </div>
      <div className="border-b bg-card">
        <div className="container-wide flex gap-2.5 py-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="container-wide grid gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_38%] xl:grid-cols-[minmax(0,1fr)_40%]">
        <div className="space-y-3">
          <Skeleton className="h-6 w-72" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
        <Skeleton className="hidden h-[calc(100dvh-6rem)] rounded-xl lg:block" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="container-wide pb-8 pt-3" role="status" aria-label="Loading">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_31rem]">
        <div className="space-y-5">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-56 rounded-xl sm:h-64 md:h-[18rem]" />
          <div className="flex gap-5">
            <Skeleton className="size-24 shrink-0 rounded-full md:size-28" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-72 max-w-full" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-7 w-96 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
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
