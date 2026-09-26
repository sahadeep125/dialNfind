import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MapPin } from "lucide-react";
import { api, publicApiOrNull } from "@/lib/api";
import type { Category, SearchResponse } from "@/lib/types";
import { CategoryIcon } from "@/components/site/category-icon";
import { LocationSwitcher } from "@/components/search/location-switcher";
import { ResultsSection, one, type SearchParamsRecord } from "@/components/search/results-section";
import { resolveLocation } from "@/lib/location";
import { JsonLd } from "@/components/json-ld";
import { clip, pageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/structured-data";

type Params = { category: string };

const getCategory = (slug: string) =>
  publicApiOrNull<{ category: Category }>(`/categories/${encodeURIComponent(slug)}`, { revalidate: 600, tags: ["categories"] });

export async function generateMetadata({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<SearchParamsRecord> }): Promise<Metadata> {
  const [{ category: slug }, sp] = await Promise.all([params, searchParams]);
  const data = await getCategory(slug);
  if (!data) return { title: "Services" };
  const category = data.category;
  const sub = category.subcategories.find((s) => s.slug === one(sp.sub));
  const name = sub ? sub.name : category.name;
  // Each subcategory is its own page; location, filters and paging all point back to it.
  const path = `/services/${category.slug}${sub ? `?sub=${encodeURIComponent(sub.slug)}` : ""}`;
  const count = category.providerCount > 0 ? `${category.providerCount.toLocaleString("en-IN")}+ ` : "";
  return pageMetadata({
    title: `${name} near you: verified local pros`,
    description: clip(`Compare ${count}${name.toLowerCase()} providers near you on DialNFind. See ratings, prices and who is open now, then call directly. ${category.description ?? ""}`),
    path,
  });
}

export default async function CategoryListingPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<SearchParamsRecord> }) {
  const [{ category: slug }, sp] = await Promise.all([params, searchParams]);
  const categoryData = await getCategory(slug);
  if (!categoryData) notFound();
  const category = categoryData.category;
  const location = await resolveLocation(sp);
  const radiusParam = Number(one(sp.radius));
  const sub = category.subcategories.find((s) => s.slug === one(sp.sub));

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

  const title = sub ? `${sub.name} services` : category.name;

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: category.name, path: `/services/${category.slug}` },
    ...(sub ? [{ name: sub.name, path: `/services/${category.slug}?sub=${encodeURIComponent(sub.slug)}` }] : []),
  ];

  return (
    <div>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          itemListJsonLd(data.results.map((r) => ({ name: r.businessName, path: `/providers/${r.slug}` }))),
        ]}
      />
      <section className="border-b bg-[linear-gradient(180deg,oklch(0.965_0.02_266),transparent)]">
        <div className="container-page py-10">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="size-3.5" />
            <Link href="/services" className="hover:text-foreground">Services</Link>
            <ChevronRight className="size-3.5" />
            {sub ? (
              <>
                <Link href={`/services/${category.slug}`} className="hover:text-foreground">{category.name}</Link>
                <ChevronRight className="size-3.5" />
                <span aria-current="page" className="text-foreground">{sub.name}</span>
              </>
            ) : (
              <span aria-current="page" className="text-foreground">{category.name}</span>
            )}
          </nav>
          <div className="mt-5 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex items-start gap-4">
              <CategoryIcon slug={category.slug} className="size-16 rounded-2xl" iconClassName="size-8" />
              <div>
                <h1 className="text-3xl font-bold text-brand-deep md:text-4xl">{title}</h1>
                <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>
              </div>
            </div>
            <LocationSwitcher location={location} />
          </div>
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            <SubLink href={`/services/${category.slug}`} active={!sub} sp={sp}>
              All {category.name.toLowerCase()}
            </SubLink>
            {category.subcategories.map((s) => (
              <SubLink key={s.slug} href={`/services/${category.slug}`} sub={s.slug} active={sub?.slug === s.slug} sp={sp}>
                {s.name}
              </SubLink>
            ))}
          </div>
        </div>
      </section>
      <div className="container-page py-8">
        <ResultsSection
          data={data}
          searchParams={sp}
          basePath={`/services/${category.slug}`}
          heading={
            <div>
              <h2 className="text-xl font-bold">
                {data.total.toLocaleString("en-IN")} {sub ? sub.name : category.name} providers
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4 text-primary" /> within {data.radiusKm} km of {location.label}
              </p>
            </div>
          }
          origin={{ lat: location.latitude, lng: location.longitude }}
          radiusKm={data.radiusKm}
          lockedCategory={category}
          source="category_browse"
        />
      </div>
    </div>
  );
}

function SubLink({ href, sub, active, sp, children }: { href: string; sub?: string; active: boolean; sp: SearchParamsRecord; children: React.ReactNode }) {
  const qs = new URLSearchParams();
  for (const key of ["lat", "lng", "loc", "view"]) {
    const v = one(sp[key]);
    if (v) qs.set(key, v);
  }
  if (sub) qs.set("sub", sub);
  const s = qs.toString();
  return (
    <Link
      href={s ? `${href}?${s}` : href}
      className={
        active
          ? "shrink-0 rounded-full border border-primary bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
          : "shrink-0 rounded-full border bg-card px-4 py-1.5 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
      }
    >
      {children}
    </Link>
  );
}
