import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { api, publicApiOrNull } from "@/lib/api";
import { areaHref, getCategoryAreas, type CategoryArea } from "@/lib/category-areas";
import type { Category, SearchResponse, Subcategory } from "@/lib/types";
import { LocationSwitcher } from "@/components/search/location-switcher";
import { ResultsSection, one, type SearchParamsRecord } from "@/components/search/results-section";
import { SearchHero } from "@/components/search/search-hero";
import { ServiceContent } from "@/components/seo/service-content";
import { CategoryGuide, getCategoryGuide, guideFaqs } from "@/components/seo/category-guide";
import { JsonLd } from "@/components/json-ld";
import { CATEGORY_SEO } from "@/content/seo/categories";
import type { ServiceSeo } from "@/content/types";
import { SUBCATEGORY_SEO } from "@/content/seo/subcategories";
import { guidesForCategory, guidesForSubcategory } from "@/lib/guides";
import { resolveLocation } from "@/lib/location";
import { SEO_CITY, clip, pageMetadata } from "@/lib/seo";
import { serviceHref } from "@/lib/service-href";
import { categoryPhoto } from "@/lib/stock-images";
import { breadcrumbJsonLd, faqJsonLd, itemListJsonLd } from "@/lib/structured-data";

export const getCategory = (slug: string) =>
  publicApiOrNull<{ category: Category }>(`/categories/${encodeURIComponent(slug)}`, { revalidate: 600, tags: ["categories"] });

/** How people search for each category with a place name ("beauty parlours in Hakimpara"). */
const AREA_NOUN: Record<string, string> = {
  "beauty-salon": "Beauty Parlours & Salons",
  "vehicle-repair": "Bike & Car Service",
  tutors: "Home Tutors",
  "electronics-repair": "Mobile & TV Repair",
  "home-appliances": "AC & Appliance Repair",
  electricians: "Electricians",
  plumbing: "Plumbers",
  carpentry: "Carpenters",
  cleaning: "Cleaning Services",
  "pest-control": "Pest Control",
  painting: "Painters",
  "packers-movers": "Packers & Movers",
  locksmith: "Locksmiths",
  tailoring: "Tailors",
  drivers: "Drivers",
  masonry: "Masons",
  welding: "Welders",
  photography: "Photographers",
  "fitness-yoga": "Yoga & Fitness Trainers",
  laundry: "Laundry & Dry Cleaning",
};
const areaNoun = (category: Category) => AREA_NOUN[category.slug] ?? category.name;

/** Title, description, H1 and intro for a "<service> in <area>" page; written from the area's own listings. */
function areaCopy(category: Category, area: CategoryArea, names: string[] = [], total = area.providers) {
  const noun = areaNoun(category);
  const place = `${area.area}, ${area.city}`;
  const count = total.toLocaleString("en-IN");
  const including = names.length ? `, including ${names.slice(0, 3).join(", ")}` : "";
  return {
    title: `${noun} in ${place}`,
    description: clip(
      `Find ${count} ${noun.toLowerCase()} in ${place} on KaajVa. See addresses, services, hours and reviews, then call or WhatsApp directly. No booking fee.`,
    ),
    h1: `${noun} in ${place}`,
    intro: [
      `${area.area} has ${count} ${noun.toLowerCase()} listed on KaajVa${including}. Each listing shows the address, the services offered, opening hours and customer reviews where people have left them, so you can choose one close by and call directly.`,
      `Not the right fit? See all ${noun.toLowerCase()} across ${area.city}, or try one of the nearby areas listed on this page.`,
    ],
    faqs: [],
  };
}

/**
 * The results page number from ?page=, or 1. Pages 2 and up are their own canonical URL (with a "Page N"
 * title), so Google crawls and keeps them, and through them finds every listing past the first twelve. When
 * they all pointed back to page 1, Google dropped them as duplicates and most profiles were left unlinked.
 */
export function listingPage(sp: SearchParamsRecord): number {
  const n = Number(one(sp.page));
  return Number.isInteger(n) && n > 1 ? n : 1;
}

function paged(meta: Parameters<typeof pageMetadata>[0], page: number) {
  if (page <= 1) return pageMetadata(meta);
  return pageMetadata({ ...meta, title: `${meta.title} (Page ${page})`, description: clip(`Page ${page}. ${meta.description}`), path: `${meta.path}?page=${page}` });
}

export function areaMetadata(category: Category, area: CategoryArea, page = 1): Metadata {
  const copy = areaCopy(category, area);
  return paged({ title: copy.title, description: copy.description, path: areaHref(category.slug, area.slug) }, page);
}

/** The category page content written in the admin console, field by field over the repository copy. */
function adminCopy(category: Category, base: ServiceSeo): ServiceSeo {
  const paragraphs = (category.seoContent ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const faqs = (category.faqs ?? []).filter((f) => f?.q?.trim() && f?.a?.trim());
  return {
    title: category.seoTitle?.trim() || base.title,
    description: category.seoDescription?.trim() ? clip(category.seoDescription) : base.description,
    h1: category.seoHeading?.trim() || base.h1,
    intro: paragraphs.length ? paragraphs : base.intro,
    faqs: faqs.length ? faqs : base.faqs,
  };
}

/** Admin-written copy, else editorial copy, else text generated from the category when none is written yet. */
function pageCopy(category: Category, sub: Subcategory | undefined): ServiceSeo {
  if (sub) return SUBCATEGORY_SEO[sub.slug] ?? generatedCopy(category, sub);
  return adminCopy(category, CATEGORY_SEO[category.slug] ?? generatedCopy(category, undefined));
}

function generatedCopy(category: Category, sub: Subcategory | undefined): ServiceSeo {
  const name = sub ? sub.name : category.name;
  const count = category.providerCount > 0 ? `${category.providerCount.toLocaleString("en-IN")}+ ` : "";
  return {
    title: `${name} near me in ${SEO_CITY}`,
    description: clip(`Compare ${count}${name.toLowerCase()} providers near you on KaajVa. See ratings, prices and who is open now, then call directly. ${category.description ?? ""}`),
    h1: sub ? `${sub.name} near you` : category.name,
    intro: category.description ? [category.description] : [],
    faqs: [],
  };
}

export function listingMetadata(category: Category, sub: Subcategory | undefined, page = 1): Metadata {
  const copy = pageCopy(category, sub);
  // An uploaded category photo is the link preview; otherwise the site's default share image is used.
  const images = category.imageUrl ? [{ url: category.imageUrl, alt: categoryPhoto(category).alt }] : undefined;
  // Location and filters point back to the plain category or subcategory address; each results page keeps its own.
  return paged({ title: copy.title, description: copy.description, path: serviceHref(category.slug, sub?.slug), images }, page);
}

/** A category page, or one of its subcategories: hero, results near the visitor, then the written guide. */
export async function CategoryListing({
  category,
  sub,
  area,
  searchParams: sp,
}: {
  category: Category;
  sub?: Subcategory;
  /** A "<service> in <area>" page: listings in that locality, wherever the visitor is. */
  area?: CategoryArea;
  searchParams: SearchParamsRecord;
}) {
  const [location, allAreas] = await Promise.all([resolveLocation(sp), sub ? Promise.resolve([] as CategoryArea[]) : getCategoryAreas()]);
  const areas = allAreas.filter((a) => a.category === category.slug && a.slug !== area?.slug);
  const radiusParam = Number(one(sp.radius));
  const basePath = area ? areaHref(category.slug, area.slug) : serviceHref(category.slug, sub?.slug);

  const data = await api<SearchResponse>("/search/providers", {
    query: {
      category: sub ? undefined : category.slug,
      subcategory: sub?.slug,
      ...(area
        ? { area: area.area, city: area.city }
        : { lat: location.latitude, lng: location.longitude, radiusKm: radiusParam > 0 ? radiusParam : undefined }),
      minRating: one(sp.minRating),
      openNow: one(sp.openNow),
      verified: one(sp.verified),
      type: one(sp.type),
      sort: one(sp.sort),
      page: one(sp.page),
      pageSize: 12,
    },
  });
  const copy = area ? areaCopy(category, area, data.results.map((r) => r.businessName), data.total) : pageCopy(category, sub);
  // The counted guide and its questions, for category and service pages (area pages have their own copy).
  const guide = area || category.providerCount === 0 ? null : await getCategoryGuide({ category, sub, noun: sub ? sub.name : areaNoun(category), areas: allAreas });
  const faqs = [...copy.faqs, ...(guide ? guideFaqs(guide).filter((f) => !copy.faqs.some((c) => c.q === f.q)) : [])];

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: category.name, path: serviceHref(category.slug) },
    ...(sub ? [{ name: sub.name, path: basePath }] : []),
    ...(area ? [{ name: area.area, path: basePath }] : []),
  ];
  const guides = (sub ? guidesForSubcategory(category.slug, sub.slug) : guidesForCategory(category.slug)).slice(0, 4);
  const noun = areaNoun(category).toLowerCase();
  const areaLinks = areas.slice(0, 20).map((a) => ({ href: areaHref(category.slug, a.slug), label: `${areaNoun(category)} in ${a.area}` }));
  const related = area
    ? [{ href: serviceHref(category.slug), label: `All ${noun} in ${area.city}` }, ...areaLinks]
    : sub
    ? [
        { href: serviceHref(category.slug), label: `All ${category.name.toLowerCase()}` },
        ...category.subcategories.filter((s) => s.slug !== sub.slug).map((s) => ({ href: serviceHref(category.slug, s.slug), label: s.name })),
      ]
    : category.subcategories.map((s) => ({ href: serviceHref(category.slug, s.slug), label: `${s.name} near me` }));

  return (
    <div>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          itemListJsonLd(data.results.map((r) => ({ name: r.businessName, path: `/providers/${r.slug}` }))),
          ...(faqs.length ? [faqJsonLd(faqs)] : []),
        ]}
      />
      <SearchHero
        above={
          <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <Link href="/services" className="hover:text-foreground">Services</Link>
            <ChevronRight className="size-3.5" aria-hidden />
            {sub || area ? (
              <>
                <Link href={serviceHref(category.slug)} className="hover:text-foreground">{category.name}</Link>
                <ChevronRight className="size-3.5" aria-hidden />
                <span aria-current="page" className="font-medium text-foreground">{sub?.name ?? area?.area}</span>
              </>
            ) : (
              <span aria-current="page" className="font-medium text-foreground">{category.name}</span>
            )}
          </nav>
        }
        title={copy.h1}
        subtitle={category.description}
        image={sub || area ? undefined : categoryPhoto(category)}
      >
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {!area && (
            <div className="on-light [&>div]:h-12">
              <LocationSwitcher location={location} />
            </div>
          )}
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {category.providerCount.toLocaleString("en-IN")} {category.name.toLowerCase()} {category.providerCount === 1 ? "professional" : "professionals"} listed
          </p>
        </div>
        <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
          <SubLink href={serviceHref(category.slug)} active={!sub} sp={sp}>
            All {category.name.toLowerCase()}
          </SubLink>
          {category.subcategories.map((s) => (
            <SubLink key={s.slug} href={serviceHref(category.slug, s.slug)} active={sub?.slug === s.slug} sp={sp}>
              {s.name}
            </SubLink>
          ))}
        </div>
      </SearchHero>
      <ResultsSection
        data={data}
        searchParams={sp}
        basePath={basePath}
        heading={
          <h2 className="text-base text-muted-foreground">
            <span className="font-bold text-foreground">
              {data.total.toLocaleString("en-IN")} {data.total === 1 ? "pro" : "pros"}
            </span>{" "}
            {area ? (
              <>
                for {noun} in {area.area}, {area.city}
              </>
            ) : (
              <>
                for {(sub ? sub.name : category.name).toLowerCase()} within {data.radiusKm} km of {location.label}
              </>
            )}
          </h2>
        }
        origin={area ? null : { lat: location.latitude, lng: location.longitude }}
        radiusKm={data.radiusKm}
        lockedCategory={category}
        lockedSub={sub?.slug}
        source="category_browse"
      />
      {guide && <CategoryGuide g={guide} />}
      {(copy.intro.length > 0 || faqs.length > 0 || guides.length > 0) && (
        <ServiceContent
          heading={
            area ? `About ${noun} in ${area.area}` : sub ? `About ${sub.name.toLowerCase()} in ${SEO_CITY}` : `About ${category.name.toLowerCase()} in ${SEO_CITY}`
          }
          intro={copy.intro}
          faqs={faqs}
          guides={guides}
          related={related}
          relatedHeading={area ? `More ${noun} nearby` : sub ? `More ${category.name.toLowerCase()} services` : `Popular ${category.name.toLowerCase()} services`}
          areas={!area && !sub && areaLinks.length ? { heading: `${areaNoun(category)} by area`, links: areaLinks } : undefined}
        />
      )}
    </div>
  );
}

/** A subcategory chip that keeps the visitor's location and view. */
function SubLink({ href, active, sp, children }: { href: string; active: boolean; sp: SearchParamsRecord; children: React.ReactNode }) {
  const qs = new URLSearchParams();
  for (const key of ["lat", "lng", "loc", "view"]) {
    const v = one(sp[key]);
    if (v) qs.set(key, v);
  }
  const s = qs.toString();
  return (
    <Link
      href={s ? `${href}?${s}` : href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "shrink-0 rounded-md bg-white px-3.5 py-1.5 text-sm font-semibold text-board"
          : "shrink-0 rounded-md bg-white/10 px-3.5 py-1.5 text-sm text-white/90 transition-colors hover:bg-white/20 hover:text-white"
      }
    >
      {children}
    </Link>
  );
}
