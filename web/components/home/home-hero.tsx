import Link from "next/link";
import { SearchBar } from "@/components/search/search-bar";
import { CyclingWord } from "./cycling-word";
import { NearbyProviders } from "./nearby-providers";

/** The things that break most often, in the words people use. The masthead cycles through them. */
const BROKEN = ["mixer", "AC", "fridge", "tap", "fan", "phone", "geyser", "bike"];

/**
 * The masthead: a navy board that says what KaajVa does with one moving word, then the search, the searches
 * people make most, and (on wide screens, beside it) the pros nearest to the visitor right now.
 */
export function HomeHero({
  popular,
  stats,
}: {
  popular: { label: string; href: string }[];
  stats: { providers: number; categories?: number; reviews: number };
}) {
  return (
    <section className="relative overflow-hidden bg-board text-board-foreground">
      <div className="container-wide grid gap-10 pb-12 pt-10 md:pb-16 md:pt-14 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)] lg:gap-14 lg:pb-20 lg:pt-16">
        <div className="min-w-0">
          <h1 className="text-[2.6rem] font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-[3.6rem] lg:text-[4.6rem] xl:text-[5.25rem]">
            <span className="sr-only">Find repair technicians and local pros near you in Siliguri. </span>
            <span aria-hidden>
              Your <CyclingWord words={BROKEN} className="text-cta" /> stopped?
              <br />
              <span className="text-board-muted">Find who fixes it,</span> nearby.
            </span>
          </h1>
          <p className="mt-6 max-w-[38rem] text-[17px] leading-relaxed text-board-muted md:text-lg">
            {stats.providers.toLocaleString("en-IN")} repair shops, technicians and local pros across Siliguri. See who is closest and open, then call or WhatsApp them yourself. No
            booking fee.
          </p>

          <SearchBar variant="joined" className="mt-8 max-w-[52rem]" />

          {popular.length > 0 && (
            <div className="mt-5 flex max-w-[52rem] flex-wrap items-center gap-2">
              <h2 className="mr-1 text-sm font-medium text-board-muted">Popular searches</h2>
              <ul className="contents">
                {popular.map((p) => (
                  <li key={p.href}>
                    <Link
                      href={p.href}
                      className="inline-flex h-9 items-center rounded-full border border-board-rule px-3.5 text-sm font-medium text-board-foreground transition-colors hover:border-cta hover:bg-cta hover:text-cta-foreground"
                    >
                      {p.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Real listings near the visitor, loaded in the browser so the page itself stays cached. */}
        <NearbyProviders />
      </div>
    </section>
  );
}
