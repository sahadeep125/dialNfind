import { formatKm } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The distance rail (DESIGN.md): a dashed line down the left with one stop per item, the distance set large
 * beside it. Distance is what people compare first, so it gets the strongest position in the list.
 */
export function DistanceRail({ className, children, label }: { className?: string; children: React.ReactNode; label?: string }) {
  return (
    <ol aria-label={label} className={cn("rail space-y-4 [--rail-x:0.3125rem] sm:[--rail-x:0.4375rem]", className)}>
      {children}
    </ol>
  );
}

export function RailStop({ distanceKm, children, className }: { distanceKm: number | null | undefined; children: React.ReactNode; className?: string }) {
  const known = distanceKm !== null && distanceKm !== undefined;
  const [value, unit] = known ? formatKm(distanceKm).split(" ") : ["", ""];
  return (
    <li className={cn("relative grid grid-cols-[minmax(0,1fr)] gap-2 pl-6 sm:grid-cols-[4.75rem_minmax(0,1fr)] sm:gap-4 sm:pl-8", className)}>
      <span aria-hidden className="absolute left-0 top-5 size-3 rounded-full border-2 border-ink-rule bg-background sm:top-6 sm:size-4" />
      <p className="flex items-baseline gap-1 pt-0.5 sm:block sm:pt-4">
        {known ? (
          <>
            <span className="font-display text-xl font-bold leading-none tabular-nums tracking-[-0.02em] sm:text-[1.75rem]">{value}</span>
            <span className="text-sm font-medium text-muted-foreground sm:block sm:pt-1">{unit} away</span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Distance not known</span>
        )}
      </p>
      <div className="min-w-0">{children}</div>
    </li>
  );
}
