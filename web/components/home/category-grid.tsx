import Link from "next/link";
import type { Category } from "@/lib/types";
import { CategoryGlyph } from "@/components/site/category-icon";
import { serviceHref } from "@/lib/service-href";

/**
 * Every trade in the city, set like a newspaper's classifieds: the trade, how many pros list it, and its
 * services as inline links, so each service page is one click from home. Busiest trades first.
 */
export function CategoryGrid({ categories }: { categories: Category[] }) {
  const sorted = [...categories].sort((a, b) => b.providerCount - a.providerCount);
  if (sorted.length === 0) return null;
  return (
    <div className="columns-1 gap-10 sm:columns-2 lg:columns-3 xl:columns-4 [column-rule:1px_solid_var(--border)]">
      {sorted.map((c) => (
        <section key={c.id} className="mb-7 break-inside-avoid">
          <h3 className="flex items-baseline gap-2 text-lg font-bold leading-tight">
            <CategoryGlyph slug={c.slug} className="relative top-0.5 size-4 shrink-0 text-cta-strong" strokeWidth={2} />
            <Link href={serviceHref(c.slug)} className="link-draw">
              {c.name}
            </Link>
            {c.providerCount > 0 && <span className="ml-auto shrink-0 text-sm font-normal tabular-nums text-muted-foreground">{c.providerCount.toLocaleString("en-IN")}</span>}
          </h3>
          {c.subcategories?.length > 0 && (
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              {c.subcategories.map((s, i) => (
                <span key={s.id}>
                  <Link href={serviceHref(c.slug, s.slug)} className="text-foreground/80 underline decoration-border decoration-1 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground">
                    {s.name}
                  </Link>
                  {i < c.subcategories.length - 1 && <span aria-hidden> · </span>}
                </span>
              ))}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
