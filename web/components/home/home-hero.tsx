import Image from "next/image";
import Link from "next/link";
import { SearchBar } from "@/components/search/search-bar";
import { PROVIDER_IMAGE } from "@/lib/stock-images";
import { HeroCity } from "./hero-city";

/**
 * First screen: what Kaajva does in one line, the search (the page's one job), the searches people make most,
 * and three hard facts. The photograph sits beside it on wide screens only, so phones get the search first.
 */
export function HomeHero({
  popular,
  stats,
}: {
  popular: { label: string; href: string }[];
  stats: { providers: number; categories?: number; reviews: number };
}) {
  const facts = [
    `${stats.providers.toLocaleString("en-IN")} local pros${stats.categories ? ` in ${stats.categories} services` : ""}`,
    // Shown only once there are reviews: "0 customer reviews" reads as an empty site.
    stats.reviews > 0 ? `${stats.reviews.toLocaleString("en-IN")}+ customer reviews` : "Call or WhatsApp them directly",
    "No booking fee, no commission",
  ];
  return (
    <section className="border-b bg-background">
      <div className="container-wide grid items-center gap-10 py-8 md:py-12 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] xl:gap-14 xl:py-14">
        <div className="hero-enter min-w-0">
          <h1 className="text-[2.25rem] font-extrabold leading-[1.04] tracking-[-0.03em] text-foreground sm:text-[3rem] lg:text-[3.75rem]">
            Something to fix? Find a local pro near you in <HeroCity />.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Appliance and mobile repair, electricians, plumbers, mechanics, salons and tutors. See who is nearest and open, then call or WhatsApp them yourself.
          </p>

          <SearchBar variant="joined" className="mt-7 max-w-3xl" />

          {popular.length > 0 && (
            <div className="mt-5 max-w-3xl">
              <h2 className="sr-only">Popular searches</h2>
              <ul className="flex flex-wrap gap-2">
                {popular.map((p) => (
                  <li key={p.href}>
                    <Link
                      href={p.href}
                      className="inline-flex h-9 items-center rounded-full border border-input bg-card px-3.5 text-sm font-medium text-foreground/85 transition-colors hover:border-primary/40 hover:bg-secondary hover:text-primary"
                    >
                      {p.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t pt-5 text-sm font-medium text-foreground/80">
            {facts.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-cta" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="hero-enter hero-enter-late relative hidden aspect-[4/5] max-h-[38rem] overflow-hidden rounded-lg bg-muted xl:block">
          <Image src={PROVIDER_IMAGE.src} alt={PROVIDER_IMAGE.alt} fill priority sizes="34rem" className="object-cover object-[62%_center]" />
        </div>
      </div>
    </section>
  );
}
