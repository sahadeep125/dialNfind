import type { Metadata } from "next";
import Link from "next/link";
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

export default async function HomePage() {
  const [{ categories }, stats, { terms }] = await Promise.all([
    publicApi<{ categories: Category[] }>("/categories", { revalidate: 600, tags: ["categories"] }),
    publicApi<{ providers: number; categories: number; cities: number; reviews: number }>("/stats", { revalidate: 3600 }),
    publicApi<{ terms: { term: string }[] }>("/search/popular", { revalidate: 600 }),
  ]);
  const popular = terms.length ? terms.slice(0, 6).map((t) => t.term) : ["AC repair", "Electrician", "Plumber", "TV repair", "Carpenter", "RO service"];

  return (
    <>
      <HomeHero stats={stats} popular={popular.map((term) => ({ label: term, href: `/search?q=${encodeURIComponent(term)}` }))} />

      <section className="section-y">
        <div className="container-page">
          <SectionHeading
            eyebrow="Services"
            title="What do you need help with?"
            description={`${stats.categories} categories of home and local services, from quick repairs to big moves.`}
            action={{ href: "/services", label: "All services" }}
          />
          <div className="mt-8">
            <CategoryGrid categories={categories} />
          </div>
        </div>
      </section>

      {/* Loads in the browser, since it depends on the visitor's location. */}
      <NearbyProviders />

      <section id="how" className="section-y scroll-mt-16 border-y bg-card">
        <div className="container-page">
          <SectionHeading eyebrow="How it works" title="Hire a local pro in three steps" align="center" />
          <div className="mt-10">
            <HowItWorks />
          </div>
        </div>
      </section>

      <section className="section-y">
        <div className="container-page">
          <TrustPoints />
        </div>
      </section>

      <Testimonials />

      {/* Popular services: plain links so every service page is one click from home ---------------- */}
      <section className="section-y">
        <div className="container-page">
          <SectionHeading eyebrow="Near you" title={`Popular services in ${SEO_CITY}`} action={{ href: "/guides", label: "Service guides" }} />
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
            DialNFind helps you find trusted local professionals near you: electricians, plumbers, AC and fridge repair, TV and mobile repair, home cleaning, pest control, painters,
            carpenters, packers and movers, home tutors, beauty services and car and bike mechanics. Compare ratings, prices and distance, then call or WhatsApp the provider
            directly, with no booking fees or commission.
          </p>
          <div className="mt-8 grid gap-x-8 gap-y-8 border-t pt-8 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <div key={c.id}>
                <h3 className="text-[15px] font-semibold">
                  <Link href={serviceHref(c.slug)} className="hover:text-cta">
                    {c.name}
                  </Link>
                </h3>
                <ul className="mt-2.5 space-y-2">
                  {c.subcategories.slice(0, 5).map((s) => (
                    <li key={s.id}>
                      <Link href={serviceHref(c.slug, s.slug)} className="text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline">
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

      <section>
        <div className="container-page">
          <PromoBanners />
        </div>
      </section>
    </>
  );
}
