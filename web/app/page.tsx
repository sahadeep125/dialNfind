import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, PhoneCall, ShieldCheck, Star } from "lucide-react";
import { publicApi } from "@/lib/api";
import type { Category } from "@/lib/types";
import { CallSpot, CompareSpot, LocationSpot, SearchSpot } from "@/components/illustrations/spots";
import { CategoryIcon } from "@/components/site/category-icon";
import { NearbyProviders } from "@/components/home/nearby-providers";
import { HomeHero } from "@/components/home/home-hero";
import { PromoBanners } from "@/components/home/promo-banners";
import { SectionHeading } from "@/components/site/section-heading";
import { homeImage } from "@/lib/home-images";
import { SEO_CITY, pageMetadata } from "@/lib/seo";
import { serviceHref } from "@/lib/service-href";

const TITLE = "Electricians, Plumbers & Repair Services Near Me | DialNFind";

export const metadata: Metadata = {
  ...pageMetadata({
    title: TITLE,
    description:
      "Find verified electricians, plumbers, AC and TV repair, cleaners, pest control and tutors near you in Siliguri. Compare ratings and call local pros directly. No booking fees.",
    path: "/",
  }),
  // The home page title already names the site, so it skips the "| DialNFind" suffix.
  title: { absolute: TITLE },
};

/** The same for every visitor, so it is cached; the "near you" part loads in the browser. */
export const revalidate = 600;

const STEPS = [
  { art: SearchSpot, title: "Tell us what you need", text: "Type the problem or pick a service, like TV repair or a plumber." },
  { art: LocationSpot, title: "Choose your location", text: "Use your current location or pick your area so we search nearby." },
  { art: CompareSpot, title: "Compare nearby pros", text: "See ratings, distance, prices and who is open right now." },
  { art: CallSpot, title: "Call the one you prefer", text: "Tap to call or WhatsApp. No middleman, no booking fees." },
];

export default async function HomePage() {
  const [{ categories }, stats, { terms }] = await Promise.all([
    publicApi<{ categories: Category[] }>("/categories", { revalidate: 600, tags: ["categories"] }),
    publicApi<{ providers: number; categories: number; cities: number; reviews: number }>("/stats", { revalidate: 3600 }),
    publicApi<{ terms: { term: string }[] }>("/search/popular", { revalidate: 600 }),
  ]);
  const popular = terms.length ? terms.slice(0, 6).map((t) => t.term) : ["AC repair", "Electrician", "Plumber", "TV repair", "Carpenter", "RO service"];

  const statItems = [
    { value: `${stats.providers.toLocaleString("en-IN")}+`, label: "Listed professionals", icon: BadgeCheck },
    { value: stats.categories, label: "Service categories", icon: ShieldCheck },
    { value: `${stats.reviews.toLocaleString("en-IN")}+`, label: "Customer reviews", icon: Star },
    { value: "0%", label: "Commission, call directly", icon: PhoneCall },
  ];

  return (
    <>
      <HomeHero image={homeImage("hero")} popular={popular.map((term) => ({ label: term, href: `/search?q=${encodeURIComponent(term)}` }))} />

      {/* Stats ---------------------------------------------------------------------------------- */}
      <section className="border-b bg-card">
        <dl className="container-page grid grid-cols-2 gap-x-6 gap-y-5 py-6 md:grid-cols-4">
          {statItems.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="icon-tile size-11 text-primary">
                <s.icon className="size-5" />
              </span>
              <div className="flex flex-col-reverse">
                <dt className="text-sm text-muted-foreground">{s.label}</dt>
                <dd className="text-xl font-bold text-foreground">{s.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

      {/* Categories ----------------------------------------------------------------------------- */}
      <section className="container-page pt-12 md:pt-14">
        <SectionHeading title="Browse services" action={{ href: "/services", label: "All services" }} />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/services/${c.slug}`}
              className="card-surface group flex items-center gap-3 p-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-lift)]"
            >
              <CategoryIcon slug={c.slug} className="size-11 shrink-0 rounded-lg" iconClassName="size-5" />
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold leading-snug group-hover:text-primary">{c.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{c.providerCount} providers</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular near the visitor --------------------------------------------------------------- */}
      <NearbyProviders />

      {/* How it works --------------------------------------------------------------------------- */}
      <section id="how" className="container-page scroll-mt-20 pb-14">
        <SectionHeading title="How DialNFind works" action={{ href: "/about#trust", label: "Our trust approach" }} />
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="card-surface flex items-start gap-4 p-5">
              <step.art className="h-16 w-auto shrink-0" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-primary">Step {i + 1}</div>
                <h3 className="mt-1 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ranked by ratings, verification and distance, never by who paid the most.{" "}
          <Link href="/search" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
            Find a service near me <ArrowRight className="size-4" />
          </Link>
        </p>
      </section>

      {/* Popular services: plain links so every service page is one click from home ---------------- */}
      <section className="border-t bg-muted/30">
        <div className="container-page py-12">
          <SectionHeading title={`Popular services near you in ${SEO_CITY}`} action={{ href: "/guides", label: "Service guides" }} />
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
            DialNFind helps you find trusted local professionals near you: electricians, plumbers, AC and fridge repair, TV and mobile repair, home cleaning, pest control, painters,
            carpenters, packers and movers, home tutors, beauty services and car and bike mechanics. Compare ratings, prices and distance, then call or WhatsApp the provider
            directly, with no booking fees or commission.
          </p>
          <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <div key={c.id}>
                <h3 className="text-sm font-semibold">
                  <Link href={serviceHref(c.slug)} className="hover:text-primary">
                    {c.name}
                  </Link>
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {c.subcategories.slice(0, 5).map((s) => (
                    <li key={s.id}>
                      <Link href={serviceHref(c.slug, s.slug)} className="text-sm text-muted-foreground hover:text-primary">
                        {s.name} near me
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App + providers ------------------------------------------------------------------------ */}
      <PromoBanners providerImage={homeImage("provider")} />
    </>
  );
}
