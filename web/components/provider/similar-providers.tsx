import Link from "next/link";
import { BadgeCheck, Building2, MapPin, UserRound } from "lucide-react";
import type { ProviderCard } from "@/lib/types";
import { listingParts } from "@/lib/account-type";
import { DistanceRail, RailStop } from "@/components/search/distance-rail";
import { ContactButtons } from "./contact-buttons";
import { OpenStatus } from "./provider-card";
import { ProviderAvatar } from "./provider-avatar";
import { RatingInline } from "./rating";

/**
 * Other professionals nearby who do the same work: the fallback when the first one does not pick up. Set on
 * the distance rail like search results, nearest first, so the next call is an easy choice. Each row opens
 * that profile, and calling straight from the row saves a page load.
 */
export function SimilarProviders({ providers }: { providers: ProviderCard[] }) {
  return (
    <DistanceRail label="Nearby alternatives" className="space-y-3">
      {providers.map((s) => {
        const { middle } = listingParts(s);
        const area = s.locality ? `${s.locality}, ${s.city}` : s.city;
        return (
          <RailStop key={s.id} distanceKm={s.distanceKm}>
            <article className="group relative flex flex-col gap-4 rounded-lg border bg-card p-4 transition-[box-shadow,border-color] duration-200 hover:border-ink-rule/40 hover:shadow-[var(--shadow-lift)] sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <ProviderAvatar name={s.businessName} logoUrl={s.logoUrl} categorySlug={s.primaryCategory?.slug} className="size-12 text-base" />
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-1 font-display text-[17px] font-bold leading-snug tracking-[-0.01em]">
                    <Link href={`/providers/${s.slug}`} className="line-clamp-1 decoration-2 underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline">
                      {s.businessName}
                    </Link>
                    {s.verificationStatus === "verified" && <BadgeCheck className="size-4 shrink-0 fill-success text-white" aria-label="Verified" />}
                  </h3>
                  <p className="flex min-w-0 items-center gap-1 text-sm text-foreground/75">
                    {s.businessType === "individual" ? (
                      <UserRound className="size-3.5 shrink-0 text-cta-strong" aria-label="Individual professional" />
                    ) : (
                      <Building2 className="size-3.5 shrink-0 text-primary" aria-label="Business" />
                    )}
                    <span className="truncate">{middle ?? "Local services"}</span>
                    <span className="shrink-0 text-muted-foreground" aria-hidden>
                      ·
                    </span>
                    <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{area}</span>
                    </span>
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    {s.totalReviews > 0 && <RatingInline value={s.avgRating} count={s.totalReviews} short className="text-xs [&>svg]:size-3.5" />}
                    <OpenStatus provider={s} className="text-sm" />
                  </div>
                </div>
              </div>
              <ContactButtons provider={s} source="profile" categorySlug={s.primaryCategory?.slug} size="sm" className="relative z-10 shrink-0 sm:w-64 [&>*]:h-9 [&>*]:flex-1" />
            </article>
          </RailStop>
        );
      })}
    </DistanceRail>
  );
}
