"use client";

import { useEffect, useState } from "react";
import { ProviderTile } from "@/components/provider/provider-tile";
import { SectionHeading } from "@/components/site/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { clientApi } from "@/lib/client";
import { useSavedLocation } from "@/lib/saved-location";
import { buildSearchHref } from "@/lib/search-href";
import type { ProviderCard as ProviderCardType } from "@/lib/types";

/** Top providers around the visitor's saved location. Loaded in the browser so the home page can be cached. */
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
  const place = location ? location.city || location.name : null;
  return (
    <section className="container-page py-12 md:py-14">
      <SectionHeading
        title={place ? `Popular in ${place}` : "Popular near you"}
        action={{ href: location ? buildSearchHref("", location) : "/search", label: "See all" }}
      />
      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-busy={!providers}>
        {providers
          ? providers.map((p) => <ProviderTile key={p.id} provider={p} />)
          : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[25rem] rounded-xl" />)}
      </div>
    </section>
  );
}
