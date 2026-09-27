import Image from "next/image";
import Link from "next/link";
import type { LocationOption } from "@/lib/types";
import type { StockImage } from "@/lib/stock-images";
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
  image,
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
  /** A photo beside the title on wide screens, for category pages. */
  image?: StockImage;
  size?: "lg" | "md";
  className?: string;
  /** Replaces the search box and "Popular" row, for pages that filter in place. */
  children?: React.ReactNode;
}) {
  return (
    <section className={cn("border-b bg-card", className)}>
      <div className={cn("container-wide grid items-center gap-8", image && "lg:grid-cols-[minmax(0,1fr)_24rem]", size === "lg" ? "py-10 md:py-14" : "py-7 md:py-9")}>
        <div className="min-w-0">
          {above}
          <h1 className={cn("max-w-3xl font-bold leading-tight text-foreground", size === "lg" ? "text-3xl md:text-[2.75rem]" : "text-2xl md:text-[2rem]")}>{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground md:text-base">{subtitle}</p>}
          {children ?? <SearchBar initialQuery={initialQuery} initialLocation={initialLocation} size={size} className="mt-6 max-w-5xl" />}
          {!children && popular.length > 0 && (
            <div className="no-scrollbar mt-4 flex items-center gap-2 overflow-x-auto pb-1">
              <span className="shrink-0 text-sm text-muted-foreground">Popular:</span>
              {popular.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  className="shrink-0 rounded-md border bg-background px-3 py-1.5 text-sm text-foreground/80 transition-colors hover:border-foreground/25 hover:text-foreground"
                >
                  {p.label}
                </Link>
              ))}
            </div>
          )}
        </div>
        {image && (
          <div className="relative hidden aspect-[4/3] overflow-hidden rounded-lg bg-muted lg:block">
            <Image src={image.src} alt={image.alt} fill priority sizes="24rem" className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
