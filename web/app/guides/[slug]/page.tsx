import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronDown, ChevronRight, Clock, Search } from "lucide-react";
import { publicApiOrNull } from "@/lib/api";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/json-ld";
import { GUIDES, getGuide, guidesForCategory, readingMinutes } from "@/lib/guides";
import { pageMetadata } from "@/lib/seo";
import { serviceHref } from "@/lib/service-href";
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/structured-data";

type Params = { slug: string };

/** Every guide is written in the repository, so all of them are built ahead and unknown slugs are 404s. */
export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams(): Params[] {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) return {};
  return {
    ...pageMetadata({ title: guide.metaTitle, description: guide.description, path: `/guides/${guide.slug}`, type: "article" }),
    keywords: guide.keywords,
  };
}

const anchor = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const formatDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function GuidePage({ params }: { params: Promise<Params> }) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();

  const data = await publicApiOrNull<{ categories: Category[] }>("/categories", { revalidate: 600, tags: ["categories"] });
  const category = data?.categories.find((c) => c.slug === guide.category);
  const categoryName = category?.name ?? guide.category;
  const subs = (category?.subcategories ?? []).filter((s) => guide.subcategories.includes(s.slug));
  const more = guidesForCategory(guide.category).filter((g) => g.slug !== guide.slug);
  const others = GUIDES.filter((g) => g.category !== guide.category).slice(0, 3);
  const path = `/guides/${guide.slug}`;

  return (
    <article className="container-page max-w-5xl py-10">
      <JsonLd
        data={[
          articleJsonLd({ ...guide, path }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Guides", path: "/guides" },
            { name: guide.title, path },
          ]),
          faqJsonLd(guide.faqs),
        ]}
      />

      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="size-3.5" />
        <Link href="/guides" className="hover:text-foreground">Guides</Link>
        <ChevronRight className="size-3.5" />
        <Link href={serviceHref(guide.category)} className="hover:text-foreground">{categoryName}</Link>
      </nav>

      <header className="mt-5 max-w-3xl">
        <h1 className="text-3xl font-extrabold leading-tight text-brand-deep md:text-4xl">{guide.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{guide.summary}</p>
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>By the DialNFind team</span>
          <span aria-hidden>·</span>
          <time dateTime={guide.dateModified}>Updated {formatDate(guide.dateModified)}</time>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden /> {readingMinutes(guide)} min read
          </span>
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 max-w-3xl">
          {guide.sections.map((s) => (
            <section key={s.heading} id={anchor(s.heading)} className="scroll-mt-24 pb-8">
              <h2 className="text-2xl font-bold text-foreground">{s.heading}</h2>
              {s.paragraphs.map((p) => (
                <p key={p.slice(0, 40)} className="mt-4 leading-relaxed text-foreground/85">
                  {p}
                </p>
              ))}
              {s.list && (
                <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-foreground/85 marker:text-primary">
                  {s.list.map((item) => (
                    <li key={item.slice(0, 40)}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section id="faq" className="scroll-mt-24 pb-8">
            <h2 className="text-2xl font-bold text-foreground">Frequently asked questions</h2>
            <div className="mt-4 divide-y card-surface">
              {guide.faqs.map((f) => (
                <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    <h3 className="text-base">{f.q}</h3>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <p className="text-sm text-muted-foreground">
            Prices in this guide are typical ranges for guidance only. They vary by city, provider and the exact job; always ask for a quote before work starts.
          </p>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="On this page" className="card-surface p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">On this page</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {guide.sections.map((s) => (
                <li key={s.heading}>
                  <a href={`#${anchor(s.heading)}`} className="hover:text-primary">{s.heading}</a>
                </li>
              ))}
              <li>
                <a href="#faq" className="hover:text-primary">Frequently asked questions</a>
              </li>
            </ol>
          </nav>

          <div className="rounded-2xl bg-accent/60 p-5">
            <h2 className="font-bold">Find {categoryName.toLowerCase()} near you</h2>
            <p className="mt-1 text-sm text-muted-foreground">Compare ratings and prices, then call local pros directly. No booking fees.</p>
            <Button asChild className="mt-4 w-full">
              <Link href={serviceHref(guide.category)}>
                <Search aria-hidden /> Browse {categoryName.toLowerCase()}
              </Link>
            </Button>
            {subs.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm">
                {subs.map((s) => (
                  <li key={s.slug}>
                    <Link href={serviceHref(guide.category, s.slug)} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                      {s.name} near me <ArrowRight className="size-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {[...more, ...others].length > 0 && (
        <section className="mt-6 border-t pt-10">
          <h2 className="text-xl font-bold">More guides</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...more, ...others].slice(0, 3).map((g) => (
              <Link key={g.slug} href={`/guides/${g.slug}`} className="card-surface group p-5 transition-shadow hover:shadow-[var(--shadow-lift)]">
                <h3 className="font-semibold leading-snug group-hover:text-primary">{g.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{g.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
