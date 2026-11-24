import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicApi } from "@/lib/api";
import type { Category } from "@/lib/types";
import { CategoryGrid } from "@/components/home/category-grid";
import { HomeHero } from "@/components/home/home-hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { NearbyProviders } from "@/components/home/nearby-providers";
import { PromoBanners } from "@/components/home/promo-banners";
import { AppPromo } from "@/components/home/app-promo";
import { FixGrid } from "@/components/home/fix-grid";
import { PopularSearches } from "@/components/home/popular-searches";
import { getCategoryAreas } from "@/lib/category-areas";
import { Testimonials } from "@/components/home/testimonials";
import { TrustPoints } from "@/components/home/trust-points";
import { SectionHeading } from "@/components/site/section-heading";
import { SEO_CITY, pageMetadata } from "@/lib/seo";
import { serviceHref } from "@/lib/service-href";

const TITLE = "KaajVa: Repair & Local Services Near You in Siliguri";

export const metadata: Metadata = {
  ...pageMetadata({
    title: TITLE,
    description:
      "Find repair technicians and local pros near you in Siliguri: appliance, AC and mobile repair, electricians, plumbers, salons and tutors. Call or WhatsApp directly.",
    path: "/",
  }),
  // The home page title already names the site, so it skips the "| KaajVa" suffix.
  title: { absolute: TITLE },
};

/**
 * Hero shortcuts. They link to service pages rather than /search (which robots.txt blocks), so the home
 * page passes its weight to the pages that should rank, led by the services with the most listings.
 */
const POPULAR = [
  { label: "AC repair", href: serviceHref("home-appliances", "ac-repair-and-service") },
  { label: "Mixer grinder repair", href: serviceHref("home-appliances", "mixer-grinder-repair") },
  { label: "Electrician", href: serviceHref("electricians") },
  { label: "Mobile repair", href: serviceHref("electronics-repair", "mobile-phone-repair") },
  { label: "Plumber", href: serviceHref("plumbing") },
  { label: "Bike service", href: serviceHref("vehicle-repair", "bike-service") },
  { label: "Beauty parlour", href: serviceHref("beauty-salon") },
  { label: "Home tutor", href: serviceHref("tutors") },
];

/** The same for every visitor, so it is cached; the "near you" part loads in the browser. */
export const revalidate = 600;

export default async function HomePage() {
  const [{ categories }, stats, areas] = await Promise.all([
    publicApi<{ categories: Category[] }>("/categories", { revalidate: 600, tags: ["categories"] }),
    publicApi<{ providers: number; categories: number; cities: number; reviews: number }>("/stats", { revalidate: 3600, tags: ["stats"] }),
    getCategoryAreas(),
  ]);

  return (
    <>
      <HomeHero stats={stats} popular={POPULAR} />

      <section aria-labelledby="needs-title" className="section-y">
        <div className="container-wide">
          <SectionHeading id="needs-title" title="What's the problem?" description="Start from what went wrong. Each one opens the pros nearby who fix it, nearest first." />
          <div className="mt-8">
            <FixGrid />
          </div>
          <div className="mt-10 flex justify-center">
            <Button asChild size="lg" variant="outline" className="shadow-[var(--shadow-card)]">
              <Link href="/search">
                View all professionals <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* For pros: listing is free. High on the page, so businesses find it without scrolling to the end. */}
      <section className="bg-surface py-14 md:py-20">
        <div className="container-wide">
          <PromoBanners />
        </div>
      </section>

      {/* Loads in the browser, since it depends on the visitor's location. */}
      <NearbyProviders />

      <section aria-labelledby="services-title" className="section-y border-y bg-surface">
        <div className="container-wide">
          <SectionHeading
            id="services-title"
            title={`All services in ${SEO_CITY}`}
            description="Home repairs, beauty, tuition, vehicles and moving. Each service lists every business we know of, claimed or not."
            action={{ href: "/services", label: `All ${stats.categories} services` }}
          />
          <div className="mt-10">
            <CategoryGrid categories={categories} />
          </div>
        </div>
      </section>

      <section className="section-y">
        <div className="container-wide">
          <AppPromo />
        </div>
      </section>

      <section id="how" aria-labelledby="how-title" className="section-y scroll-mt-16 border-y bg-[#eef3fc]">
        <div className="container-wide">
          <SectionHeading id="how-title" title="How KaajVa works" description="A directory, not a booking service: we show you the business, you deal with them directly." />
          <div className="mt-10">
            <HowItWorks />
          </div>
          <div className="mt-16">
            <TrustPoints />
          </div>
        </div>
      </section>

      <Testimonials />

      <section aria-labelledby="popular-title" className="section-y">
        <div className="container-wide">
          <SectionHeading id="popular-title" title={`Popular searches in ${SEO_CITY}`} />
          <div className="mt-8">
            <PopularSearches areas={areas} />
          </div>
        </div>
      </section>

    </>
  );
}
