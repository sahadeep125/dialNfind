import Image from "next/image";
import Link from "next/link";
import { SearchBar } from "@/components/search/search-bar";
import { PROVIDER_IMAGE } from "@/lib/stock-images";
import { HeroCity } from "./hero-city";

/** First screen: what KaajVa is, one hard fact, the search, and a photograph of the work. */
export function HomeHero({
  popular,
  stats,
}: {
  popular: { label: string; href: string }[];
  stats: { providers: number; categories?: number; reviews: number };
}) {
  const listed = `${stats.providers.toLocaleString("en-IN")} local businesses listed`;
  const facts = [
    stats.categories ? `${listed} across ${stats.categories} services` : listed,
    // Shown only once there are reviews: "0 customer reviews" reads as an empty site.
    stats.reviews > 0 ? `${stats.reviews.toLocaleString("en-IN")}+ customer reviews` : "Free to use, no sign-up needed",
    "No booking fees or commission",
  ];
  return (
    <section className="border-b bg-background">
      <div className="container-wide grid items-center gap-10 py-10 md:py-14 xl:min-h-[calc(100svh-4rem)] xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:gap-16 xl:py-12">
        <div className="hero-enter min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            Local services directory · <HeroCity />, West Bengal
          </p>
          <h1 className="mt-4 text-[2.5rem] font-bold leading-[1.04] tracking-[-0.03em] text-foreground sm:text-[3.25rem] lg:text-[4rem]">
            Find a local pro in <HeroCity /> and call them directly.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Electricians, salons, tutors, mechanics and repair shops, with their phone numbers, opening hours and reviews in one place. You talk to the business, not to us.
          </p>

          <SearchBar variant="joined" className="mt-8 max-w-3xl" />

          {popular.length > 0 && (
            <p className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-2 text-[15px]">
              <span className="text-muted-foreground">Popular:</span>
              {popular.map((p) => (
                <Link key={p.href} href={p.href} className="link-draw font-medium text-foreground">
                  {p.label}
                </Link>
              ))}
            </p>
          )}

          <ul className="mt-10 grid gap-3 border-t pt-6 text-sm text-foreground sm:grid-cols-3 sm:gap-6">
            {facts.map((f) => (
              <li key={f} className="border-l-2 border-cta pl-3 font-medium leading-snug">
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="hero-enter hero-enter-late relative aspect-[4/3] overflow-hidden rounded-lg bg-muted sm:aspect-[16/9] xl:aspect-[4/5] xl:max-h-[calc(100svh-9rem)]">
          <Image src={PROVIDER_IMAGE.src} alt={PROVIDER_IMAGE.alt} fill priority sizes="(min-width: 1280px) 34rem, 100vw" className="object-cover object-[62%_center]" />
        </div>
      </div>
    </section>
  );
}
