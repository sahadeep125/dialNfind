import type { ProviderDetail } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { ExpandableGrid } from "./expandable";

const PRICE_UNIT_LABEL = { per_visit: "per visit", per_hour: "per hour", fixed: "fixed price" } as const;

/** The provider's services as a price list, primary service first. */
export function ServicesList({ services }: { services: ProviderDetail["services"] }) {
  const sorted = [...services].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  return (
    <>
      <ExpandableGrid
        title="Services & pricing"
        initial={6}
        moreLabel={`View all ${services.length} services`}
        className="divide-y overflow-hidden rounded-lg border bg-card"
        items={sorted.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{s.subcategory?.name ?? s.category.name}</span>
                {s.isPrimary && <span className="rounded bg-cta-soft px-1.5 py-0.5 text-[11px] font-semibold text-cta-hover">Main service</span>}
              </div>
              {s.subcategory && <div className="mt-0.5 text-xs text-muted-foreground">{s.category.name}</div>}
            </div>
            <div className="shrink-0 text-right">
              {s.startingPrice ? (
                <>
                  <div className="font-bold">{formatPrice(s.startingPrice)}</div>
                  <div className="text-xs text-muted-foreground">{PRICE_UNIT_LABEL[s.priceUnit]}</div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">On request</div>
              )}
            </div>
          </div>
        ))}
      />
      <p className="mt-3 text-xs text-muted-foreground">Prices are indicative starting rates set by the provider. Confirm the final price on the call.</p>
    </>
  );
}
