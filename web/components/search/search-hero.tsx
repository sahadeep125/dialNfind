import Link from "next/link";
import type { LocationOption } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SearchBar } from "./search-bar";

/** The light header of the search and category pages: breadcrumb, title, then the search box (or the page's own controls). */
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
    // The dark header band: navy behind the title and search, so the white fields and the results below stand out.
    <section className={cn("dark-band bg-board text-board-foreground", className)}>
      <div className={cn("container-wide", size === "lg" ? "py-10 md:py-14" : "py-8 md:py-10")}>
        <div className="min-w-0">
          {above}
          <h1 className={cn("max-w-3xl font-bold leading-tight text-white", size === "lg" ? "text-3xl md:text-[2.75rem]" : "text-2xl md:text-[2rem]")}>{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-board-muted md:text-base">{subtitle}</p>}
          {children ?? <SearchBar initialQuery={initialQuery} initialLocation={initialLocation} size={size} className="mt-6 max-w-5xl" />}
          {!children && popular.length > 0 && (
            <div className="no-scrollbar mt-4 flex items-center gap-2 overflow-x-auto pb-1">
              <span className="shrink-0 text-sm text-board-muted">Popular:</span>
              {popular.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  className="shrink-0 rounded-md bg-white/10 px-3 py-1.5 text-sm text-white/90 transition-colors hover:bg-white/20 hover:text-white"
                >
                  {p.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
