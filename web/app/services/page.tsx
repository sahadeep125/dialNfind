import type { Metadata } from "next";
import { SEO_CITY, pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { publicApi } from "@/lib/api";
import type { Category } from "@/lib/types";
import { SearchHero } from "@/components/search/search-hero";
import { CategoryIcon } from "@/components/site/category-icon";
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
      <SearchHero title="What do you need help with?" subtitle="Browse every category on DialNFind, or search for the exact service you need." />
      <div className="container-wide py-10">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id} className="card-surface flex flex-col p-6 transition-shadow hover:shadow-[var(--shadow-lift)]">
              <div className="flex items-start gap-4">
                <CategoryIcon slug={c.slug} />
                <div className="min-w-0 flex-1">
                  <Link href={`/services/${c.slug}`} className="font-display text-lg font-bold hover:text-primary">
                    {c.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                </div>
              </div>
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {c.subcategories.map((s) => (
                  <li key={s.id}>
                    <Link href={serviceHref(c.slug, s.slug)} className="inline-block rounded-lg bg-muted px-3 py-1.5 text-[13px] font-medium text-foreground/75 transition-colors hover:bg-primary/10 hover:text-primary">
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={`/services/${c.slug}`} className="mt-auto flex items-center gap-1 pt-6 text-sm font-semibold text-primary">
                {c.providerCount} providers <ArrowRight className="size-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
