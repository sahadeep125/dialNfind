import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder while a page's data loads (used by the loading.tsx files). */
export function ListingSkeleton() {
  return (
    <div className="container-page py-8" role="status" aria-label="Loading">
      <Skeleton className="h-14 w-full max-w-3xl rounded-2xl" />
      <Skeleton className="mt-8 h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-48" />
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="pb-8" role="status" aria-label="Loading">
      <Skeleton className="h-40 w-full rounded-none md:h-56" />
      <div className="container-page">
        <Skeleton className="relative -mt-16 h-56 rounded-3xl md:-mt-20" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-8">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <Skeleton className="h-80 rounded-2xl" />
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
