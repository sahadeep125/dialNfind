import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Star, Tag, Zap } from "lucide-react";
import { SearchBar } from "@/components/search/search-bar";
import { HeroIllustration } from "@/components/illustrations/hero-illustration";
import { cn } from "@/lib/utils";
import { HeroCity } from "./hero-city";

const TRUST = [
  { icon: BadgeCheck, label: "Verified Professionals", color: "text-[oklch(0.6_0.13_165)]", filled: false },
  { icon: Star, label: "Real Reviews", color: "text-warning", filled: true },
  { icon: Tag, label: "Fair Pricing", color: "text-primary", filled: false },
  { icon: Zap, label: "Quick Response", color: "text-primary", filled: true },
];

/** Light home banner: headline with the visitor's city, one-box search, popular searches and a trust card. */
export function HomeHero({ image, popular }: { image: string | null; popular: { label: string; href: string }[] }) {
  return (
    <section className="relative isolate overflow-hidden border-b bg-[linear-gradient(105deg,oklch(0.99_0.004_250)_0%,oklch(0.965_0.018_255)_100%)]">
      {image ? (
        <>
          <Image src={image} alt="" fill priority className="-z-20 object-cover object-right" sizes="100vw" />
          {/* Keeps the text side readable over the photo. */}
          <div className="absolute inset-0 -z-10 bg-white/80 md:bg-transparent md:bg-[linear-gradient(90deg,white_0%,rgb(255_255_255/0.92)_38%,rgb(255_255_255/0.35)_62%,transparent_80%)]" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute -right-40 -top-40 -z-10 size-[42rem] rounded-full bg-[radial-gradient(closest-side,oklch(0.9_0.07_266/0.55),transparent)]" />
          {/* Sits left of the trust card so the two never overlap. */}
          <HeroIllustration className="pointer-events-none absolute right-[calc(max(2rem,(100vw-96rem)/2+2rem)+16rem)] top-1/2 -z-10 hidden w-[27%] max-w-[26rem] -translate-y-1/2 min-[1400px]:block" />
        </>
      )}

      <div className="container-page grid items-end gap-8 py-12 md:py-16 lg:grid-cols-[minmax(0,1fr)_15rem] lg:py-20">
        <div className="min-w-0 max-w-[46rem]">
          <h1 className="text-[2rem] font-bold leading-[1.15] text-foreground sm:text-[2.6rem] lg:text-5xl">
            Trusted professionals
            <br />
            for all your home needs
            <br />
            in{" "}
            <span className="relative inline-block text-primary">
              <HeroCity />
              <svg viewBox="0 0 200 12" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-2.5 w-full text-primary" aria-hidden>
                <path d="M2 9C50 3 140 1 198 6" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-foreground/75 md:text-lg">
            Find, compare and connect with verified local experts for home services, fast, reliable and at the right price.
          </p>
          <SearchBar variant="joined" className="mt-7" />
          {popular.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-sm text-foreground/70">Popular:</span>
              {popular.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  className="rounded-full border bg-card/90 px-4 py-1.5 text-sm text-foreground/80 shadow-xs transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {p.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <ul className="hidden grid-cols-2 gap-x-3 gap-y-5 rounded-xl border border-white/70 bg-white/85 p-5 text-center shadow-[var(--shadow-lift)] backdrop-blur-md lg:grid">
          {TRUST.map((t) => (
            <li key={t.label} className="flex flex-col items-center gap-2">
              <t.icon className={cn("size-7", t.color)} fill={t.filled ? "currentColor" : "none"} strokeWidth={t.filled ? 0 : 2} />
              <span className="text-[13px] leading-tight text-foreground/80">{t.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
