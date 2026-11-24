"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OpenStatus } from "@/components/provider/provider-card";
import { ProviderAvatar } from "@/components/provider/provider-avatar";
import { clientApi } from "@/lib/client";
import { formatKm } from "@/lib/format";
import { listingParts } from "@/lib/account-type";
import { useSavedLocation } from "@/lib/saved-location";
import { buildSearchHref } from "@/lib/search-href";
import type { ProviderCard as ProviderCardType } from "@/lib/types";

/**
 * "Near you right now": the closest well-ranked pros around the visitor's saved area, on a short distance
 * rail inside the masthead. Loaded in the browser so the home page can be cached for everyone.
 */
export function NearbyProviders() {
  const location = useSavedLocation();
  const [providers, setProviders] = useState<ProviderCardType[] | null>(null);

  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    clientApi<{ results: ProviderCardType[] }>(`/providers/featured?lat=${location.latitude}&lng=${location.longitude}&limit=4`)
      .then((data) => !cancelled && setProviders(data.results))
      .catch(() => !cancelled && setProviders([]));
    return () => {
      cancelled = true;
    };
  }, [location]);

  if (providers && providers.length === 0) return null;
  const place = location ? location.name || location.city : null;
  return (
    <section aria-labelledby="nearby-title" className="min-w-0 self-end rounded-lg bg-board-deep/70 p-5 ring-1 ring-board-rule sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="nearby-title" className="text-lg font-bold">
          Near {place ?? "you"} right now
        </h2>
        <Link href={location ? buildSearchHref("", location) : "/search"} className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-cta">
          See all <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <ol className="mt-4 divide-y divide-board-rule" aria-busy={!providers}>
        {providers
          ? providers.map((p) => {
              const { middle } = listingParts(p);
              return (
                <li key={p.id}>
                  <Link href={`/providers/${p.slug}`} className="group grid grid-cols-[4.5rem_2.75rem_minmax(0,1fr)] items-center gap-3 py-3">
                    <span className="whitespace-nowrap font-display text-xl font-bold tabular-nums leading-none text-white">
                      {p.distanceKm !== null && p.distanceKm !== undefined ? formatKm(p.distanceKm) : "—"}
                    </span>
                    <ProviderAvatar name={p.businessName} logoUrl={p.logoUrl} categorySlug={p.primaryCategory?.slug} className="size-11 text-sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold decoration-1 underline-offset-4 group-hover:underline">{p.businessName}</span>
                      <span className="block truncate text-sm text-board-muted">{middle ?? p.city}</span>
                      <OpenStatus provider={p} compact onDark className="mt-0.5" />
                    </span>
                  </Link>
                </li>
              );
            })
          : Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="grid grid-cols-[4.5rem_2.75rem_minmax(0,1fr)] items-center gap-3 py-3">
                <span className="h-5 w-10 rounded-sm bg-white/10" />
                <span className="size-11 rounded-lg bg-white/10" />
                <span className="space-y-2">
                  <span className="block h-4 w-3/4 rounded-sm bg-white/10" />
                  <span className="block h-3 w-1/2 rounded-sm bg-white/10" />
                </span>
              </li>
            ))}
      </ol>
    </section>
  );
}
