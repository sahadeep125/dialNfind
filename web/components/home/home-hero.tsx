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
    <section className="relative overflow-hidden border-b border-[#dbe4f5] bg-[radial-gradient(40rem_22rem_at_88%_0%,rgb(253_128_3/0.14),transparent_70%),radial-gradient(48rem_26rem_at_8%_100%,rgb(4_33_97/0.10),transparent_70%),linear-gradient(180deg,#e2eafa_0%,#eef3fc_100%)]">
      {/* A faint dot grid over the tint, so the band has texture without a photo. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(4_33_97/0.08)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(180deg,black,transparent_85%)]" />
      <div className="container-page relative flex flex-col items-center py-14 text-center md:py-20 lg:py-24">
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
