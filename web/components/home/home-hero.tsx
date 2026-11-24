import Link from "next/link";
import { SearchBar } from "@/components/search/search-bar";
import { HeroCity } from "./hero-city";

/**
 * First screen, centred: what KaajVa does in one line, the search (the page's one job), the searches people
 * make most, and three hard facts. No photograph: the search is the picture.
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
    <section className="relative overflow-hidden border-b bg-[radial-gradient(70rem_28rem_at_50%_-6rem,var(--secondary),transparent_70%)]">
      <div className="container-page flex flex-col items-center py-14 text-center md:py-20 lg:py-24">
        <div className="hero-enter w-full">
          <h1 className="mx-auto max-w-4xl text-balance text-[2.25rem] font-extrabold leading-[1.06] tracking-[-0.03em] text-foreground sm:text-[3rem] lg:text-[3.5rem]">
            Something to fix? Find a local pro near you in <HeroCity />.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Appliance and mobile repair, electricians, plumbers, mechanics, salons and tutors. See who is nearest and open, then call or WhatsApp them yourself.
          </p>

          <SearchBar variant="joined" className="mx-auto mt-8 max-w-3xl text-left" />

          {popular.length > 0 && (
            <div className="mx-auto mt-5 max-w-3xl">
              <h2 className="sr-only">Popular searches</h2>
              <ul className="flex flex-wrap justify-center gap-2">
                {popular.map((p) => (
                  <li key={p.href}>
                    <Link
                      href={p.href}
                      className="inline-flex h-9 items-center rounded-full border border-border bg-card px-3.5 text-sm font-medium text-foreground/80 shadow-[var(--shadow-card)] transition-colors hover:bg-secondary hover:text-primary"
                    >
                      {p.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-foreground/70">
            {facts.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-cta" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
