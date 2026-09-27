import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { api, publicApiOrNull } from "@/lib/api";
import type { Category, SearchResponse, Subcategory } from "@/lib/types";
import { CategoryIcon } from "@/components/site/category-icon";
import { LocationSwitcher } from "@/components/search/location-switcher";
import { ResultsSection, one, type SearchParamsRecord } from "@/components/search/results-section";
import { SearchHero } from "@/components/search/search-hero";
import { ServiceContent } from "@/components/seo/service-content";
import { JsonLd } from "@/components/json-ld";
import { CATEGORY_SEO } from "@/content/seo/categories";
import { categoryImage } from "@/lib/stock-images";
import { SUBCATEGORY_SEO } from "@/content/seo/subcategories";
import { guidesForCategory, guidesForSubcategory } from "@/lib/guides";
import { resolveLocation } from "@/lib/location";
import { SEO_CITY, clip, pageMetadata } from "@/lib/seo";
import { serviceHref } from "@/lib/service-href";
import { breadcrumbJsonLd, faqJsonLd, itemListJsonLd } from "@/lib/structured-data";

export const getCategory = (slug: string) =>
  publicApiOrNull<{ category: Category }>(`/categories/${encodeURIComponent(slug)}`, { revalidate: 600, tags: ["categories"] });

/** Editorial copy for the page, or text generated from the category when none is written yet. */
function pageCopy(category: Category, sub: Subcategory | undefined) {
  const written = sub ? SUBCATEGORY_SEO[sub.slug] : CATEGORY_SEO[category.slug];
  if (written) return written;
  const name = sub ? sub.name : category.name;
  const count = category.providerCount > 0 ? `${category.providerCount.toLocaleString("en-IN")}+ ` : "";
  return {
    title: `${name} near me in ${SEO_CITY}`,
    description: clip(`Compare ${count}${name.toLowerCase()} providers near you on DialNFind. See ratings, prices and who is open now, then call directly. ${category.description ?? ""}`),
    h1: sub ? `${sub.name} near you` : category.name,
    intro: category.description ? [category.description] : [],
    faqs: [],
  };
}

export function listingMetadata(category: Category, sub: Subcategory | undefined): Metadata {
  const copy = pageCopy(category, sub);
  // Location, filters and paging all point back to the plain category or subcategory address.
  return pageMetadata({ title: copy.title, description: copy.description, path: serviceHref(category.slug, sub?.slug) });
}

/** A category page, or one of its subcategories: hero, results near the visitor, then the written guide. */
export async function CategoryListing({ category, sub, searchParams: sp }: { category: Category; sub?: Subcategory; searchParams: SearchParamsRecord }) {
  const location = await resolveLocation(sp);
  const radiusParam = Number(one(sp.radius));
  const copy = pageCopy(category, sub);
  const basePath = serviceHref(category.slug, sub?.slug);

  const data = await api<SearchResponse>("/search/providers", {
    query: {
      category: sub ? undefined : category.slug,
      subcategory: sub?.slug,
      lat: location.latitude,
      lng: location.longitude,
      radiusKm: radiusParam > 0 ? radiusParam : undefined,
      minRating: one(sp.minRating),
      openNow: one(sp.openNow),
      verified: one(sp.verified),
      sort: one(sp.sort),
      page: one(sp.page),
      pageSize: 12,
    },
  });

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: category.name, path: serviceHref(category.slug) },
    ...(sub ? [{ name: sub.name, path: basePath }] : []),
  ];
  const guides = (sub ? guidesForSubcategory(category.slug, sub.slug) : guidesForCategory(category.slug)).slice(0, 4);
  const related = sub
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
          ...(copy.faqs.length ? [faqJsonLd(copy.faqs)] : []),
        ]}
      />
      <SearchHero
        above={
          <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <Link href="/services" className="hover:text-foreground">Services</Link>
            <ChevronRight className="size-3.5" aria-hidden />
            {sub ? (
              <>
                <Link href={serviceHref(category.slug)} className="hover:text-foreground">{category.name}</Link>
                <ChevronRight className="size-3.5" aria-hidden />
                <span aria-current="page" className="font-medium text-foreground">{sub.name}</span>
              </>
            ) : (
              <span aria-current="page" className="font-medium text-foreground">{category.name}</span>
            )}
          </nav>
        }
        title={copy.h1}
        subtitle={category.description}
        image={categoryImage(category.slug)}
      >
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="[&>div]:h-12">
            <LocationSwitcher location={location} />
          </div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CategoryIcon slug={category.slug} className="size-8 rounded-md" iconClassName="size-4" />
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
            for {(sub ? sub.name : category.name).toLowerCase()}{" "}
            within {data.radiusKm} km of {location.label}
          </h2>
        }
        origin={{ lat: location.latitude, lng: location.longitude }}
        radiusKm={data.radiusKm}
        lockedCategory={category}
        lockedSub={sub?.slug}
        source="category_browse"
      />
      {(copy.intro.length > 0 || copy.faqs.length > 0 || guides.length > 0) && (
        <ServiceContent
          heading={sub ? `About ${sub.name.toLowerCase()} in ${SEO_CITY}` : `About ${category.name.toLowerCase()} in ${SEO_CITY}`}
          intro={copy.intro}
          faqs={copy.faqs}
          guides={guides}
          related={related}
          relatedHeading={sub ? `More ${category.name.toLowerCase()} services` : `Popular ${category.name.toLowerCase()} services`}
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
          ? "shrink-0 rounded-md bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground"
          : "shrink-0 rounded-md border bg-background px-3.5 py-1.5 text-sm text-foreground/80 transition-colors hover:border-foreground/25 hover:text-foreground"
      }
    >
      {children}
    </Link>
  );
}
