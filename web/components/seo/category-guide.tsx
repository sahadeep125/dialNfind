import Link from "next/link";
import { Building2, IndianRupee, MapPin, UserRound, Wrench } from "lucide-react";
import { publicApi } from "@/lib/api";
import { areaHref, type CategoryArea } from "@/lib/category-areas";
import type { Category, SearchResponse, Subcategory } from "@/lib/types";
import type { Faq } from "@/content/types";
import { SEO_CITY } from "@/lib/seo";
import { serviceHref } from "@/lib/service-href";

/** Search totals are cached for an hour: the guide is counted, not live. */
const total = (query: Record<string, string>) =>
  publicApi<SearchResponse>("/search/providers", { query: { ...query, pageSize: 1 }, revalidate: 3600, tags: ["providers"] })
    .then((r) => r.total)
    .catch(() => null);

export interface CategoryGuideData {
  name: string;
  noun: string;
  total: number;
  individuals: number | null;
  areas: { area: string; href: string; count: number }[];
  services: { name: string; href: string; count: number }[];
  prices: { listed: number; sampled: number; min: number; max: number } | null;
  updated: string;
}

/**
 * Facts for a category or service page, counted from KaajVa's own listings: how many there are, individuals
 * against businesses, which neighbourhoods have the most, which services, and the prices that are listed.
 * Nothing is estimated: a fact we cannot count is left out.
 */
export async function getCategoryGuide({
  category,
  sub,
  noun,
  areas,
}: {
  category: Category;
  sub?: Subcategory;
  noun: string;
  areas: CategoryArea[];
}): Promise<CategoryGuideData | null> {
  const base: Record<string, string> = sub ? { subcategory: sub.slug } : { category: category.slug };
  const [all, individuals, sample, services] = await Promise.all([
    total(base),
    total({ ...base, type: "individual" }),
    publicApi<SearchResponse>("/search/providers", { query: { ...base, pageSize: 50 }, revalidate: 3600, tags: ["providers"] }).catch(() => null),
    sub
      ? Promise.resolve([])
      : Promise.all(category.subcategories.map(async (s) => ({ name: s.name, href: serviceHref(category.slug, s.slug), count: (await total({ subcategory: s.slug })) ?? 0 }))),
  ]);
  if (!all) return null;

  const priced = (sample?.results ?? []).map((r) => r.startingPrice).filter((p): p is number => typeof p === "number" && p > 0);
  return {
    name: sub?.name ?? category.name,
    noun,
    total: all,
    individuals,
    areas: areas
      .filter((a) => a.category === category.slug)
      .sort((a, b) => b.providers - a.providers)
      .slice(0, 9)
      .map((a) => ({ area: a.area, href: areaHref(category.slug, a.slug), count: a.providers })),
    services: services.filter((s) => s.count > 0).sort((a, b) => b.count - a.count),
    prices: priced.length ? { listed: priced.length, sampled: sample?.results.length ?? 0, min: Math.min(...priced), max: Math.max(...priced) } : null,
    updated: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
  };
}

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const n = (v: number) => v.toLocaleString("en-IN");

/** Questions answered from the same counts, for the FAQ list and its structured data. */
export function guideFaqs(g: CategoryGuideData): Faq[] {
  const noun = g.noun;
  const faqs: Faq[] = [
    {
      q: `How many ${noun} listings are there in ${SEO_CITY}?`,
      a: `KaajVa lists ${n(g.total)} ${noun} pros and businesses in and around ${SEO_CITY}. Each listing shows the address, the services offered and opening hours where the business has given them, and you can call or WhatsApp them directly.`,
    },
  ];
  if (g.areas.length > 0) {
    const top = g.areas.slice(0, 3);
    faqs.push({
      q: `Which areas of ${SEO_CITY} have the most ${noun} listings?`,
      a: `${top.map((a) => `${a.area} (${n(a.count)})`).join(", ")} ${top.length === 1 ? "has" : "have"} the most ${noun} listings. Set your area on this page to see the nearest first.`,
    });
  }
  if (g.individuals !== null && g.total > 0) {
    const companies = g.total - g.individuals;
    faqs.push({
      q: `Are these individual professionals or businesses?`,
      a:
        g.individuals === 0
          ? `All ${n(g.total)} listings are shops and businesses. Individual professionals can list themselves for free.`
          : companies === 0
          ? `All ${n(g.total)} listings are individual professionals working under their own name.`
          : `Both. ${n(g.individuals)} of the ${n(g.total)} listings are individual professionals working under their own name, and ${n(companies)} are shops and businesses. Use the "Individual professionals" or "Businesses" filter to see one kind.`,
    });
  }
  if (g.prices) {
    faqs.push({
      q: `What does ${noun} cost in ${SEO_CITY}?`,
      a: `Starting prices listed on KaajVa run from ${inr(g.prices.min)} to ${inr(g.prices.max)}. Most professionals quote after hearing the problem, so confirm the final price on the call.`,
    });
  }
  faqs.push({
    q: `Does KaajVa charge a booking fee?`,
    a: `No. KaajVa is a directory: you call or WhatsApp the professional yourself and agree the work and the price with them. There is no booking fee or commission.`,
  });
  return faqs;
}

/** The counted guide, in the style of a printed area guide: short facts under plain headings. */
export function CategoryGuide({ g }: { g: CategoryGuideData }) {
  const noun = g.noun;
  const businesses = g.individuals !== null ? g.total - g.individuals : null;
  return (
    <section aria-labelledby="guide-title" className="bg-card">
      <div className="container-wide py-12 md:py-16">
        <p className="text-sm font-semibold text-cta-strong">Guide</p>
        <h2 id="guide-title" className="mt-1 text-2xl font-bold text-foreground md:text-[2rem]">
          Guide to {noun} in {SEO_CITY}
        </h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Every number here is counted from the {noun} listings on KaajVa. Last updated {g.updated}.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-xl border border-border/70 bg-background p-6 shadow-[var(--shadow-card)]">
            <h3 className="text-lg font-bold">How many are listed</h3>
            <p className="mt-3 font-display text-4xl font-bold text-foreground">{n(g.total)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {noun} listings in and around {SEO_CITY}
            </p>
            {g.individuals !== null && businesses !== null && (
              <ul className="mt-5 space-y-2 text-[15px]">
                <li className="flex items-center gap-2.5">
                  <UserRound className="size-4 text-cta-strong" aria-hidden />
                  <span>
                    <strong>{n(g.individuals)}</strong> individual professionals
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Building2 className="size-4 text-primary" aria-hidden />
                  <span>
                    <strong>{n(businesses)}</strong> shops and businesses
                  </span>
                </li>
              </ul>
            )}
          </article>

          {g.areas.length > 0 && (
            <article className="rounded-xl border border-border/70 bg-background p-6 shadow-[var(--shadow-card)]">
              <h3 className="text-lg font-bold">Where to find them in {SEO_CITY}</h3>
              <ul className="mt-4 divide-y divide-border text-[15px]">
                {g.areas.map((a) => (
                  <li key={a.href}>
                    <Link href={a.href} className="group flex items-center gap-2.5 py-2">
                      <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="flex-1 group-hover:text-primary group-hover:underline">{a.area}</span>
                      <span className="tabular-nums text-muted-foreground">{n(a.count)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          )}

          {g.services.length > 0 && (
            <article className="rounded-xl border border-border/70 bg-background p-6 shadow-[var(--shadow-card)]">
              <h3 className="text-lg font-bold">{g.name} services people look for</h3>
              <ul className="mt-4 divide-y divide-border text-[15px]">
                {g.services.slice(0, 9).map((s) => (
                  <li key={s.href}>
                    <Link href={s.href} className="group flex items-center gap-2.5 py-2">
                      <Wrench className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="flex-1 group-hover:text-primary group-hover:underline">{s.name}</span>
                      <span className="tabular-nums text-muted-foreground">{n(s.count)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          )}

          {g.prices && (
            <article className="rounded-xl border border-border/70 bg-background p-6 shadow-[var(--shadow-card)]">
              <h3 className="text-lg font-bold">What it costs</h3>
              <p className="mt-3 flex items-baseline gap-2 font-display text-3xl font-bold">
                <IndianRupee className="size-5 self-center text-muted-foreground" aria-hidden />
                {inr(g.prices.min)} – {inr(g.prices.max)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Starting prices from the {n(g.prices.listed)} listings that show one
                {g.prices.sampled < g.total ? `, among the ${n(g.prices.sampled)} nearest the city centre` : ""}. Most pros quote after hearing the problem, so confirm the price on the call.
              </p>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
