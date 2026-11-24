import Link from "next/link";
import { Check } from "lucide-react";
import type { Category, ProviderDetail } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { serviceHref } from "@/lib/service-href";
import { cn } from "@/lib/utils";
import { ExpandableGrid } from "./expandable";

const PRICE_UNIT_LABEL = { per_visit: "per visit", per_hour: "per hour", fixed: "fixed price" } as const;

/**
 * Everything the professional does, main service first. Each service links to its own page, so visitors can
 * compare others who do the same job, and search engines see which services this profile belongs to. Prices
 * show only where the professional set one.
 */
export function ServicesList({ services, businessName, categories = [] }: { services: ProviderDetail["services"]; businessName: string; categories?: Category[] }) {
  // A listing for a whole category ("Home Appliances") takes every job in it, so name those jobs too.
  const offered = new Set(services.map((s) => s.subcategory?.slug).filter(Boolean));
  const covers = services
    .filter((s) => !s.subcategory)
    .flatMap((s) => {
      const cat = categories.find((c) => c.slug === s.category.slug);
      return (cat?.subcategories ?? []).filter((sub) => !offered.has(sub.slug)).map((sub) => ({ ...sub, categorySlug: s.category.slug, categoryName: s.category.name }));
    });
  const sorted = [...services].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  const anyPrice = sorted.some((s) => s.startingPrice);
  return (
    <>
      <ExpandableGrid
        title={`Services offered by ${businessName}`}
        initial={8}
        moreLabel={`View all ${services.length} services`}
        className="grid gap-2 sm:grid-cols-2"
        items={sorted.map((s) => {
          const name = s.subcategory?.name ?? s.category.name;
          const price = formatPrice(s.startingPrice);
          return (
            <Link
              key={s.id}
              href={serviceHref(s.category.slug, s.subcategory?.slug)}
              className={cn(
                "group flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:border-foreground/20 hover:bg-muted/50",
                s.isPrimary && "border-primary/25 bg-secondary/40",
              )}
            >
              <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", s.isPrimary ? "bg-primary text-primary-foreground" : "bg-success-soft text-success-ink")}>
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold decoration-1 underline-offset-4 group-hover:underline">{name}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.isPrimary ? "Main service" : s.category.name}</span>
              </span>
              {price && (
                <span className="shrink-0 text-right text-sm">
                  <span className="block font-bold tabular-nums">{price}</span>
                  <span className="block text-xs text-muted-foreground">{PRICE_UNIT_LABEL[s.priceUnit]}</span>
                </span>
              )}
            </Link>
          );
        })}
      />
      {covers.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-foreground/80">Listed for all {Array.from(new Set(covers.map((c) => c.categoryName))).join(" and ").toLowerCase()} work, including</h3>
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {covers.map((c) => (
              <li key={c.slug}>
                <Link href={serviceHref(c.categorySlug, c.slug)} className="block rounded-md border bg-card px-2.5 py-1.5 text-[13px] font-medium text-foreground/85 transition-colors hover:border-foreground/25 hover:bg-muted">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {anyPrice && <p className="mt-3 text-xs text-muted-foreground">Prices are starting rates set by the professional. Confirm the final price on the call.</p>}
    </>
  );
}
