import Link from "next/link";
import { ArrowRight, BookOpen, ChevronDown } from "lucide-react";
import type { Faq, Guide } from "@/content/types";

/**
 * The written part of a category or subcategory page, under the results: an introduction, related
 * services, guides and questions. It gives search engines and first-time visitors the context a list of
 * businesses alone does not.
 */
export function ServiceContent({
  heading,
  intro,
  faqs,
  guides,
  related,
  relatedHeading,
}: {
  heading: string;
  intro: string[];
  faqs: Faq[];
  guides: Guide[];
  related: { href: string; label: string }[];
  relatedHeading: string;
}) {
  return (
    <section className="border-t bg-muted/30">
      <div className="container-wide grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 max-w-3xl">
          <h2 className="text-2xl font-bold text-foreground">{heading}</h2>
          <div className="mt-4 space-y-4 leading-relaxed text-foreground/80">
            {intro.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>

          {faqs.length > 0 && (
            <>
              <h2 className="mt-10 text-xl font-bold text-foreground">Frequently asked questions</h2>
              <div className="mt-4 divide-y card-surface">
                {faqs.map((f) => (
                  <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                      <h3 className="text-base">{f.q}</h3>
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <p className="mt-3 leading-relaxed text-muted-foreground">{f.a}</p>
                  </details>
                ))}
              </div>
            </>
          )}
        </div>

        <aside className="space-y-8">
          {guides.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold">
                <BookOpen className="size-4 text-primary" aria-hidden /> Helpful guides
              </h2>
              <ul className="mt-3 space-y-2">
                {guides.map((g) => (
                  <li key={g.slug}>
                    <Link href={`/guides/${g.slug}`} className="card-surface group flex items-start justify-between gap-3 p-3.5 text-sm font-medium hover:border-primary/30">
                      <span className="group-hover:text-primary">{g.title}</span>
                      <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {related.length > 0 && (
            <div>
              <h2 className="text-base font-bold">{relatedHeading}</h2>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {related.map((r) => (
                  <li key={r.href}>
                    <Link href={r.href} className="inline-block rounded-lg bg-card px-3 py-1.5 text-[13px] font-medium text-foreground/75 ring-1 ring-border transition-colors hover:text-primary">
                      {r.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
