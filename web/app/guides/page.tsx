import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { publicApiOrNull } from "@/lib/api";
import type { Category } from "@/lib/types";
import { CategoryIcon } from "@/components/site/category-icon";
import { SearchHero } from "@/components/search/search-hero";
import { JsonLd } from "@/components/json-ld";
import { GUIDES, readingMinutes } from "@/lib/guides";
import { pageMetadata } from "@/lib/seo";
import { serviceHref } from "@/lib/service-href";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/structured-data";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Home Service Guides: Costs, Checklists & Tips",
  description: "Practical guides to home services in India: repair and service costs, how to hire the right professional, checklists and seasonal tips from DialNFind.",
  path: "/guides",
});

export default async function GuidesPage() {
  const data = await publicApiOrNull<{ categories: Category[] }>("/categories", { revalidate: 600, tags: ["categories"] });
  const names = new Map(data?.categories.map((c) => [c.slug, c.name]));
  const groups = [...new Set(GUIDES.map((g) => g.category))].map((slug) => ({ slug, name: names.get(slug) ?? slug, guides: GUIDES.filter((g) => g.category === slug) }));

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Guides", path: "/guides" },
          ]),
          itemListJsonLd(GUIDES.map((g) => ({ name: g.title, path: `/guides/${g.slug}` }))),
        ]}
      />
      <SearchHero
        title="Home service guides"
        subtitle="What things cost, how to choose the right professional, and what to check before you call. Written for homes in Siliguri and across India."
      />
      <div className="container-wide space-y-12 py-10">
        {groups.map((group) => (
          <section key={group.slug} aria-labelledby={`g-${group.slug}`}>
            <div className="flex items-end justify-between gap-4">
              <h2 id={`g-${group.slug}`} className="flex items-center gap-3 text-xl font-bold">
                <CategoryIcon slug={group.slug} className="size-9 shrink-0 rounded-lg" iconClassName="size-4" />
                {group.name}
              </h2>
              <Link href={serviceHref(group.slug)} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">
                Find {group.name.toLowerCase()} near you <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {group.guides.map((g) => (
                <Link key={g.slug} href={`/guides/${g.slug}`} className="card-surface group flex flex-col p-5 transition-shadow hover:shadow-[var(--shadow-lift)]">
                  <h3 className="font-display text-lg font-bold leading-snug group-hover:text-primary">{g.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{g.description}</p>
                  <span className="mt-auto flex items-center gap-1.5 pt-4 text-xs font-medium text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden /> {readingMinutes(g)} min read
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
