import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";
import { CategoryIcon } from "@/components/site/category-icon";

export const metadata: Metadata = { title: "All services" };

export default async function ServicesPage() {
  const { categories } = await api<{ categories: Category[] }>("/categories");
  return (
    <div className="container-page py-12">
      <div className="max-w-2xl">
        <span className="text-sm font-semibold uppercase tracking-wider text-primary">All services</span>
        <h1 className="mt-2 text-4xl font-bold text-brand-deep">What do you need help with?</h1>
        <p className="mt-3 text-muted-foreground">Browse every category on DialNFind. Pick a service to see providers near you.</p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <div key={c.id} className="flex flex-col rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
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
                  <Link href={`/services/${c.slug}?sub=${s.slug}`} className="inline-block rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
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
  );
}
