import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, PhoneCall, Star } from "lucide-react";
import { SearchBar } from "@/components/search/search-bar";
import { HERO_IMAGE } from "@/lib/stock-images";
import { HeroCity } from "./hero-city";

/** Photo banner with the city-specific headline, the two-field search, popular searches and headline numbers. */
export function HomeHero({
  popular,
  stats,
}: {
  popular: { label: string; href: string }[];
  stats: { providers: number; reviews: number };
}) {
  const facts = [
    { icon: BadgeCheck, label: `${stats.providers.toLocaleString("en-IN")}+ local professionals` },
    { icon: Star, label: `${stats.reviews.toLocaleString("en-IN")}+ customer reviews` },
    { icon: PhoneCall, label: "No booking fees or commission" },
  ];
  return (
    <section className="relative isolate overflow-hidden bg-brand-deep">
      <Image src={HERO_IMAGE.src} alt={HERO_IMAGE.alt} fill priority sizes="100vw" className="-z-20 object-cover object-[75%_center]" />
      {/* Keeps the text side readable while the tradesperson stays visible on the right. */}
      <div className="absolute inset-0 -z-10 bg-brand-deep/85 md:bg-transparent md:bg-[linear-gradient(90deg,oklch(0.22_0.055_252/0.96)_0%,oklch(0.22_0.055_252/0.88)_42%,oklch(0.22_0.055_252/0.35)_75%,oklch(0.22_0.055_252/0.15)_100%)]" />

      <div className="container-page py-14 md:py-20 lg:py-24">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white/90 ring-1 ring-white/15">
            <span className="size-1.5 rounded-full bg-cta" aria-hidden /> Local services directory for <HeroCity />
          </p>
          <h1 className="mt-5 text-[2.1rem] font-extrabold leading-[1.1] text-white sm:text-5xl lg:text-[3.5rem]">
            Find trusted electricians, plumbers &amp; repair pros in{" "}
            <span className="text-[oklch(0.8_0.13_60)]">
              <HeroCity />
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
            Compare verified local professionals by rating, distance and price, then call or WhatsApp them directly. No middleman, no booking fees.
          </p>
        </div>

        <SearchBar variant="joined" className="mt-8 max-w-4xl" />

        {popular.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm text-white/70">Popular:</span>
            {popular.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white ring-1 ring-white/15 transition-colors hover:bg-white/20"
              >
                {p.label}
              </Link>
            ))}
          </div>
        )}

        <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/15 pt-6 text-sm text-white/85">
          {facts.map((f) => (
            <li key={f.label} className="flex items-center gap-2">
              <f.icon className="size-4 text-[oklch(0.8_0.13_60)]" aria-hidden />
              {f.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
