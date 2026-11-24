import type { Metadata } from "next";
import { publicApi } from "@/lib/api";
import type { Category } from "@/lib/types";
import { CategoryGrid } from "@/components/home/category-grid";
import { HomeHero } from "@/components/home/home-hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { PromoBanners } from "@/components/home/promo-banners";
import { AppPromo } from "@/components/home/app-promo";
import { FixGrid } from "@/components/home/fix-grid";
import { PopularSearches } from "@/components/home/popular-searches";
import { ParaList } from "@/components/home/para-list";
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
        <div className="container-wide grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 id="needs-title" className="text-[2rem] font-extrabold leading-[1.02] tracking-[-0.03em] md:text-[2.75rem]">
              What&rsquo;s the problem?
            </h2>
            <p className="mt-4 max-w-[32ch] text-[17px] leading-relaxed text-muted-foreground">Start from what went wrong. Each one opens the people nearby who fix it, closest first.</p>
          </div>
          <FixGrid />
        </div>
      </section>

      {areas.length > 0 && (
        <section aria-labelledby="paras-title" className="section-y bg-board text-board-foreground">
          <div className="container-wide">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="paras-title" className="text-[2rem] font-extrabold leading-[1.02] tracking-[-0.03em] md:text-[2.75rem]">
                Pros in your para
              </h2>
              <p className="max-w-[40ch] text-[15px] leading-relaxed text-board-muted">Siliguri&rsquo;s busiest neighbourhoods, and the trades you can find in each without crossing town.</p>
            </div>
            <div className="mt-10">
              <ParaList areas={areas} />
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="services-title" className="section-y">
        <div className="container-wide">
          <SectionHeading
            id="services-title"
            title={`Every trade in ${SEO_CITY}`}
            description="Each trade lists every business we know of, claimed or not, with the services they offer."
            action={{ href: "/services", label: `All ${stats.categories} services` }}
          />
          <div className="mt-10 border-t border-ink-rule/80 pt-8">
            <CategoryGrid categories={categories} />
          </div>
        </div>
      </section>

      <section id="how" aria-labelledby="how-title" className="section-y scroll-mt-16 border-y bg-card">
        <div className="container-wide">
          <SectionHeading id="how-title" title="How KaajVa works" description="A directory, not a booking service: we show you who is near, you deal with them directly." />
          <div className="mt-12">
            <HowItWorks />
          </div>
          <div className="mt-16">
            <TrustPoints />
          </div>
        </div>
      </section>

      <Testimonials />

      <section className="section-y">
        <div className="container-wide grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <AppPromo />
          <PromoBanners />
        </div>
      </section>

      <section aria-labelledby="popular-title" className="pb-16 md:pb-24">
        <div className="container-wide border-t border-ink-rule/80 pt-10">
          <h2 id="popular-title" className="text-2xl font-bold">
            Popular searches in {SEO_CITY}
          </h2>
          <div className="mt-8">
            <PopularSearches areas={areas} />
          </div>
        </div>
      </section>
    </>
  );
}
