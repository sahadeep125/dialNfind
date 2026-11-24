import type { Metadata } from "next";
import { publicApi } from "@/lib/api";
import type { Category } from "@/lib/types";
import { CategoryGrid } from "@/components/home/category-grid";
import { HomeHero } from "@/components/home/home-hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { NearbyProviders } from "@/components/home/nearby-providers";
import { PromoBanners } from "@/components/home/promo-banners";
import { Testimonials } from "@/components/home/testimonials";
import { TrustPoints } from "@/components/home/trust-points";
import { SectionHeading } from "@/components/site/section-heading";
import { SEO_CITY, pageMetadata } from "@/lib/seo";
import { serviceHref } from "@/lib/service-href";

const TITLE = "KaajVa: Local Services & Businesses in Siliguri";

export const metadata: Metadata = {
  ...pageMetadata({
    title: TITLE,
    description:
      "Siliguri's local services directory: beauty parlours, bike and car service, home tutors, mobile and TV repair, electricians and more. Compare and call directly.",
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
  { label: "Beauty parlour", href: serviceHref("beauty-salon") },
  { label: "Bike service", href: serviceHref("vehicle-repair", "bike-service") },
  { label: "Home tutor", href: serviceHref("tutors") },
  { label: "Mobile repair", href: serviceHref("electronics-repair", "mobile-phone-repair") },
  { label: "AC repair", href: serviceHref("home-appliances", "ac-repair-and-service") },
  { label: "Electrician", href: serviceHref("electricians") },
];

/** The same for every visitor, so it is cached; the "near you" part loads in the browser. */
export const revalidate = 600;

export default async function HomePage() {
  const [{ categories }, stats] = await Promise.all([
    publicApi<{ categories: Category[] }>("/categories", { revalidate: 600, tags: ["categories"] }),
    publicApi<{ providers: number; categories: number; cities: number; reviews: number }>("/stats", { revalidate: 3600, tags: ["stats"] }),
  ]);

  return (
    <>
      <HomeHero stats={stats} popular={POPULAR} />

      <section aria-labelledby="services-title" className="section-y">
        <div className="container-wide">
          <SectionHeading
            id="services-title"
            title={`Services in ${SEO_CITY}`}
            description="Home repairs, beauty, tuition, vehicles and moving. Each service lists every business we know of, claimed or not."
            action={{ href: "/services", label: `All ${stats.categories} services` }}
          />
          <div className="mt-10">
            <CategoryGrid categories={categories} />
          </div>
        </div>
      </section>

      {/* Loads in the browser, since it depends on the visitor's location. */}
      <NearbyProviders />

      <section id="how" aria-labelledby="how-title" className="section-y scroll-mt-16 border-y bg-card">
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

      <section className="section-y">
        <div className="container-wide">
          <PromoBanners />
        </div>
      </section>
    </>
  );
}
