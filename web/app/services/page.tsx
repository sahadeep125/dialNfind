import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { SEO_CITY, pageMetadata } from "@/lib/seo";
import { publicApi } from "@/lib/api";
import type { Category } from "@/lib/types";
import { SearchHero } from "@/components/search/search-hero";
import { categoryImage } from "@/lib/stock-images";
import { serviceHref } from "@/lib/service-href";

export const revalidate = 600;

export const metadata: Metadata = pageMetadata({
  title: `All Home Services Near Me in ${SEO_CITY}`,
  description: `Browse every service on DialNFind: electricians, plumbers, AC and TV repair, cleaning, pest control, painters, tutors, movers and more near you in ${SEO_CITY}.`,
  path: "/services",
});

export default async function ServicesPage() {
  const { categories } = await publicApi<{ categories: Category[] }>("/categories", { revalidate: 600, tags: ["categories"] });
  return (
    <>
      <SearchHero
        above={
          <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <span aria-current="page" className="font-medium text-foreground">Services</span>
          </nav>
        }
        title={`Home services in ${SEO_CITY}`}
        subtitle="Browse every category on DialNFind, or search for the exact service you need."
      />
      <div className="container-wide py-10 md:py-14">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => {
            const photo = categoryImage(c.slug);
            return (
              <li key={c.id} className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-[box-shadow,border-color] hover:border-foreground/15 hover:shadow-[var(--shadow-lift)]">
                <Link href={`/services/${c.slug}`} className="relative block aspect-[16/9] overflow-hidden bg-muted" tabIndex={-1} aria-hidden>
                  <Image src={photo.src} alt="" fill sizes="(min-width: 1024px) 30rem, (min-width: 640px) 48vw, 100vw" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-lg font-bold">
                      <Link href={`/services/${c.slug}`} className="hover:text-primary hover:underline">
                        {c.name}
                      </Link>
                    </h2>
                    <span className="shrink-0 text-sm text-muted-foreground">{c.providerCount.toLocaleString("en-IN")} pros</span>
                  </div>
                  {c.description && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{c.description}</p>}
                  {/* Every service is linked, so each subcategory page is reachable from here. */}
                  <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-4">
                    {c.subcategories.map((s) => (
                      <li key={s.id} className="min-w-0">
                        <Link href={serviceHref(c.slug, s.slug)} className="block truncate text-sm text-foreground/80 transition-colors hover:text-foreground hover:underline">
                          {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link href={`/services/${c.slug}`} className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-primary hover:underline">
                    Find {c.name.toLowerCase()} near you <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
