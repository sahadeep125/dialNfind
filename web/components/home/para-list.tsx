import Link from "next/link";
import type { CategoryArea } from "@/lib/category-areas";
import { areaHref } from "@/lib/category-areas";

/**
 * Neighbourhoods ("paras") with the most listed pros, set large, each opening onto its busiest trades. This is
 * how people in the city think about distance: not kilometres, but which para.
 */
export function ParaList({ areas }: { areas: CategoryArea[] }) {
  const byArea = new Map<string, { area: string; total: number; trades: CategoryArea[] }>();
  for (const a of areas) {
    const entry = byArea.get(a.slug) ?? { area: a.area, total: 0, trades: [] };
    entry.total += a.providers;
    entry.trades.push(a);
    byArea.set(a.slug, entry);
  }
  const paras = [...byArea.values()].sort((a, b) => b.total - a.total).slice(0, 8);
  if (paras.length === 0) return null;
  return (
    <ol className="divide-y divide-board-rule border-y border-board-rule">
      {paras.map((p) => (
        <li key={p.area} className="grid gap-x-8 gap-y-2 py-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-baseline md:py-6">
          <p className="flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold tracking-[-0.03em] text-white md:text-[2.75rem]">{p.area}</span>
            <span className="text-sm tabular-nums text-board-muted">{p.total} pros</span>
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[15px]">
            {p.trades
              .sort((a, b) => b.providers - a.providers)
              .map((t) => (
                <li key={t.category}>
                  <Link href={areaHref(t.category, t.slug)} className="text-board-muted underline decoration-board-rule decoration-1 underline-offset-4 transition-colors hover:text-white hover:decoration-cta">
                    {t.categoryName} in {t.area}
                  </Link>
                </li>
              ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
