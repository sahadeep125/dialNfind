import Link from "next/link";
import { BadgeCheck, Star, Tag, Zap } from "lucide-react";
import type { LocationOption } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SearchBar } from "./search-bar";

const TRUST = [
  { icon: BadgeCheck, label: "Verified Professionals", color: "text-[oklch(0.6_0.13_165)]" },
  { icon: Star, label: "Real Reviews", color: "text-warning" },
  { icon: Tag, label: "Fair Pricing", color: "text-primary" },
  { icon: Zap, label: "Quick Response", color: "text-primary" },
];

/** Dark banner with the search box, "Popular" shortcuts and a trust card; shared by the home, search and category pages. */
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
    <section className={cn("relative isolate overflow-hidden bg-brand-deep text-white", className)}>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_85%_0%,oklch(0.53_0.2_266/0.55),transparent_60%),radial-gradient(ellipse_at_0%_100%,oklch(0.45_0.15_250/0.5),transparent_55%)]" />
      <div className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className={cn("container-wide grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]", size === "lg" ? "py-12 md:py-16" : "py-8 md:py-10")}>
        <div className="min-w-0">
          {above}
          <h1 className={cn("max-w-2xl font-bold leading-tight text-white", size === "lg" ? "text-3xl md:text-5xl" : "text-2xl md:text-[2.1rem]")}>{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-white/80 md:text-base">{subtitle}</p>}
          {children ?? <SearchBar initialQuery={initialQuery} initialLocation={initialLocation} size={size} className="mt-6 max-w-5xl" />}
          {!children && popular.length > 0 && (
            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="shrink-0 text-sm font-medium text-white/85">Popular:</span>
              {popular.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  className="shrink-0 rounded-full bg-white/15 px-4 py-1.5 text-sm text-white ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-white/25"
                >
                  {p.label}
                </Link>
              ))}
            </div>
          )}
        </div>
        <ul className="hidden grid-cols-2 gap-x-4 gap-y-5 rounded-xl bg-white/95 p-5 text-center text-foreground shadow-[var(--shadow-lift)] lg:grid">
          {TRUST.map((t) => (
            <li key={t.label} className="flex flex-col items-center gap-2">
              <t.icon className={cn("size-7", t.color)} fill={t.icon === Star ? "currentColor" : "none"} strokeWidth={t.icon === Star ? 0 : 2} />
              <span className="text-[13px] leading-tight text-foreground/80">{t.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
