"use client";

import { useEffect, useState } from "react";
import { ProviderCard } from "@/components/provider/provider-card";
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
    clientApi<{ results: ProviderCardType[] }>(`/providers/featured?lat=${location.latitude}&lng=${location.longitude}&limit=6`)
      .then((data) => !cancelled && setProviders(data.results))
      .catch(() => !cancelled && setProviders([]));
    return () => {
      cancelled = true;
    };
  }, [location]);

  if (providers && providers.length === 0) return null;
  return (
    <section className="bg-[linear-gradient(180deg,transparent,oklch(0.965_0.012_262)_20%,oklch(0.965_0.012_262)_80%,transparent)] py-20">
      <div className="container-page">
        <SectionHeading
          eyebrow={location ? `Near ${location.name}` : "Near you"}
          title="Recommended providers near you"
          description="Ranked by ratings, verification, responsiveness and distance. Never by who paid the most."
          action={{ href: location ? buildSearchHref("", location) : "/search", label: "See all nearby" }}
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-busy={!providers}>
          {providers
            ? providers.map((p) => <ProviderCard key={p.id} provider={p} source="search" />)
            : Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
        </div>
      </div>
    </section>
  );
}
