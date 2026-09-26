import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock, MessageSquareQuote, PhoneCall, ShieldCheck, Star } from "lucide-react";
import { publicApi } from "@/lib/api";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search/search-bar";
import { HeroIllustration } from "@/components/illustrations/hero-illustration";
import { BusinessIllustration, CallSpot, CompareSpot, LocationSpot, SearchSpot } from "@/components/illustrations/spots";
import { CategoryIcon } from "@/components/site/category-icon";
import { NearbyProviders } from "@/components/home/nearby-providers";
import { SectionHeading } from "@/components/site/section-heading";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "DialNFind | Find trusted local service providers near you",
    description:
      "Find reliable electricians, plumbers, TV and AC repair, cleaners, tutors and more near you. Compare ratings, check who is open now, and call local pros directly. No booking fees.",
    path: "/",
  }),
  // The home page uses the full title, without the "| DialNFind" suffix.
  title: { absolute: "DialNFind | Find trusted local service providers near you" },
};

/** The same for every visitor, so it is cached; the "near you" part loads in the browser. */
export const revalidate = 600;

export default async function HomePage() {
  const [{ categories }, stats, { terms }] = await Promise.all([
    publicApi<{ categories: Category[] }>("/categories", { revalidate: 600, tags: ["categories"] }),
    publicApi<{ providers: number; categories: number; cities: number; reviews: number }>("/stats", { revalidate: 3600 }),
    publicApi<{ terms: { term: string }[] }>("/search/popular", { revalidate: 600 }),
  ]);
  const popular = terms.length ? terms.slice(0, 6).map((t) => t.term) : ["TV repair", "AC service", "Electrician", "Plumber", "Pest control"];

  return (
    <>
      {/* Hero ------------------------------------------------------------------------------ */}
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.9_0.08_266/0.55),transparent)]" />
        <div className="container-page relative grid items-center gap-10 pb-16 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:pb-24 lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
              <span className="size-1.5 rounded-full bg-success" />
              {stats.providers.toLocaleString("en-IN")}+ local professionals across {stats.cities} cities
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] text-brand-deep sm:text-5xl lg:text-6xl">
              Find trusted local pros <span className="bg-gradient-to-r from-primary to-brand-teal bg-clip-text text-transparent">near you</span>, in seconds.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Tell us what you need and where you are. We show nearby service providers with ratings, working hours and a direct number, so you can call the one you trust.
            </p>
            <SearchBar className="mt-8" />
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Popular:</span>
              {popular.map((term) => (
                <Link
                  key={term}
                  href={`/search?q=${encodeURIComponent(term)}`}
                  className="rounded-full border bg-card px-3 py-1 text-sm text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {term}
                </Link>
              ))}
            </div>
          </div>
          <HeroIllustration className="mx-auto w-full max-w-[560px]" />
        </div>
      </section>

      {/* Stats strip -------------------------------------------------------------------------- */}
      <section className="border-y bg-card">
        <div className="container-page grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
          {[
            { value: `${stats.providers.toLocaleString("en-IN")}+`, label: "Verified and listed providers", icon: BadgeCheck },
            { value: stats.categories, label: "Service categories", icon: ShieldCheck },
            { value: `${stats.reviews.toLocaleString("en-IN")}+`, label: "Customer reviews", icon: Star },
            { value: "0%", label: "Commission. Call providers directly", icon: PhoneCall },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
                <s.icon className="size-5" />
              </span>
              <div>
                <div className="font-display text-2xl font-bold text-brand-deep">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories ----------------------------------------------------------------------------- */}
      <section className="container-page py-20">
        <SectionHeading eyebrow="Browse by category" title="Popular services" description="From a flickering light to a full home move, find the right professional in a couple of taps." action={{ href: "/services", label: "All services" }} />
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/services/${c.slug}`}
              className="group flex flex-col gap-4 rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-lift)]"
            >
              <CategoryIcon slug={c.slug} />
              <div>
                <div className="font-semibold leading-snug group-hover:text-primary">{c.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{c.providerCount} providers</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Nearby ------------------------------------------------------------------------------- */}
      <NearbyProviders />

      {/* How it works ------------------------------------------------------------------------- */}
      <section id="how" className="container-page scroll-mt-20 py-20">
        <SectionHeading eyebrow="How it works" title="From problem to phone call in under a minute" align="center" />
        <ol className="relative mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="absolute left-[12%] right-[12%] top-[72px] hidden h-px border-t-2 border-dashed border-primary/20 lg:block" />
          {[
            { art: SearchSpot, title: "Tell us what you need", text: "Type the problem or pick a service, like TV repair or a plumber." },
            { art: LocationSpot, title: "Choose your location", text: "Use your current location or pick your area so we search nearby." },
            { art: CompareSpot, title: "Compare nearby pros", text: "See ratings, distance, prices and who is open right now." },
            { art: CallSpot, title: "Call the one you prefer", text: "Tap to call or WhatsApp. No middleman, no booking fees." },
          ].map((step, i) => (
            <li key={step.title} className="relative flex flex-col items-center rounded-2xl border bg-card p-6 text-center shadow-[var(--shadow-soft)]">
              <step.art className="h-32 w-auto" />
              <span className="mt-2 flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
              <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Trust --------------------------------------------------------------------------------- */}
      <section className="container-page py-8">
        <div className="grid gap-10 overflow-hidden rounded-3xl bg-brand-deep p-8 text-white md:p-14 lg:grid-cols-2">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-[oklch(0.8_0.1_200)]">Why DialNFind</span>
            <h2 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">Built for trust, not for ads</h2>
            <p className="mt-4 max-w-lg text-[oklch(0.85_0.03_266)]">
              Every listing shows real contact details, honest ratings, and how the provider was verified. Rankings reward good service, and paid plans only nudge, never override.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-8">
              <Link href="/about#trust">
                Our trust and safety approach <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: BadgeCheck, title: "Verified providers", text: "Phone, business and ID checks shown on every profile." },
              { icon: MessageSquareQuote, title: "Real reviews", text: "Reviews from people who actually contacted the provider are marked." },
              { icon: Clock, title: "Open now, at a glance", text: "Working hours and live open status, so you call at the right time." },
              { icon: PhoneCall, title: "Direct contact", text: "Call or WhatsApp the provider directly. We never mask or resell your number." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10">
                <f.icon className="size-6 text-[oklch(0.8_0.1_200)]" />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-[oklch(0.82_0.03_266)]">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For businesses --------------------------------------------------------------------- */}
      <section className="container-page py-20">
        <div className="grid items-center gap-10 rounded-3xl border bg-card p-8 shadow-[var(--shadow-soft)] md:p-12 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">For service providers</span>
            <h2 className="mt-3 text-3xl font-bold text-brand-deep md:text-4xl">Get found by customers in your area</h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              List your business for free or claim your existing listing. Set your services, areas and hours, reply to reviews, and see how many people called you this week.
            </p>
            <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
              {["Free basic listing", "Customers call you directly", "Reply to reviews", "Weekly lead insights"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <BadgeCheck className="size-4 text-success" /> {t}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/claim">
                  List your business <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/claim#claim">Claim an existing listing</Link>
              </Button>
            </div>
          </div>
          <BusinessIllustration className="mx-auto w-full max-w-sm" />
        </div>
      </section>

      {/* Final CTA ----------------------------------------------------------------------------- */}
      <section className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.45_0.19_275)] px-8 py-14 text-center text-primary-foreground md:py-20">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse,black,transparent_70%)]" />
          <h2 className="relative text-3xl font-bold md:text-4xl">Something stopped working?</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-primary-foreground/85">Find someone nearby who can fix it today. It takes less than a minute.</p>
          <Button asChild size="lg" variant="secondary" className="relative mt-8">
            <Link href="/search">
              Find a service near me <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
