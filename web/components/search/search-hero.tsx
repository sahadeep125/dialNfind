import Link from "next/link";
import type { LocationOption } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SearchBar } from "./search-bar";

/**
 * The paper header of the search, category and index pages: breadcrumb, a display title, then the joined
 * search box (or the page's own controls). Closed off by a heavy ink rule, like the top of a printed list.
 * No photo: we only show pictures that belong to a real listing.
 */
export function SearchHero({
  title,
  subtitle,
  initialQuery,
  initialLocation,
  popular = [],
  above,
  size = "md",
  className,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  initialQuery?: string;
  initialLocation?: LocationOption;
  popular?: { label: string; href: string }[];
  /** Small content over the title, such as a breadcrumb. */
  above?: React.ReactNode;
  size?: "lg" | "md";
  className?: string;
  /** Replaces the search box and "Popular" row, for pages that filter in place. */
  children?: React.ReactNode;
}) {
  return (
    <section className={cn("border-b-[1.5px] border-ink-rule bg-background", className)}>
      <div className={cn("container-wide", size === "lg" ? "py-10 md:py-14" : "py-7 md:py-10")}>
        {above}
        <h1
          className={cn(
            "max-w-4xl font-extrabold leading-[1.04] tracking-[-0.03em] text-foreground text-balance",
            size === "lg" ? "text-[2.125rem] md:text-5xl" : "text-[1.75rem] md:text-[2.5rem]",
          )}
        >
          {title}
        </h1>
        {subtitle && <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground md:text-base">{subtitle}</p>}
        {children ?? <SearchBar initialQuery={initialQuery} initialLocation={initialLocation} variant="joined" className="mt-6 max-w-5xl" />}
        {!children && popular.length > 0 && (
          <div className="no-scrollbar -mx-4 mt-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <span className="shrink-0 text-sm font-semibold text-foreground/70">Popular:</span>
            {popular.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="shrink-0 rounded-full border border-input bg-card px-3.5 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:border-ink-rule hover:text-foreground"
              >
                {p.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
