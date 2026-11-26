import Link from "next/link";
import { BadgeCheck, Building2, MapPin, UserRound } from "lucide-react";
import type { ProviderCard } from "@/lib/types";
import { formatDistance } from "@/lib/format";
import { listingParts } from "@/lib/account-type";
import { ContactButtons } from "./contact-buttons";
import { OpenStatus } from "./provider-card";
import { ProviderAvatar } from "./provider-avatar";
import { RatingInline } from "./rating";

/**
 * Other professionals nearby who do the same work: the fallback when the first one does not pick up. Each
 * card opens that profile, and calling straight from the card saves a page load.
 */
export function SimilarProviders({ providers }: { providers: ProviderCard[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {providers.map((s) => {
        const distance = formatDistance(s.distanceKm);
        const { middle } = listingParts(s);
        const area = s.locality ? `${s.locality}, ${s.city}` : s.city;
        return (
          <li key={s.id}>
            <article className="group relative flex h-full flex-col rounded-lg border bg-card p-4 transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[var(--shadow-lift)]">
              <div className="flex items-start gap-3">
                <ProviderAvatar name={s.businessName} logoUrl={s.logoUrl} categorySlug={s.primaryCategory?.slug} className="size-12 text-base" />
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-1 text-[15px] font-semibold leading-snug">
                    <Link href={`/providers/${s.slug}`} className="line-clamp-1 decoration-1 underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline">
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
                  </p>
                  {s.totalReviews > 0 && <RatingInline value={s.avgRating} count={s.totalReviews} short className="mt-0.5 text-xs [&>svg]:size-3.5" />}
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <p className="flex min-w-0 items-center gap-1.5 text-foreground/80">
                  <MapPin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">
                    {area}
                    {distance && <span className="tabular-nums text-muted-foreground"> · {distance}</span>}
                  </span>
                </p>
                <OpenStatus provider={s} className="text-sm" />
              </div>
              <ContactButtons provider={s} source="profile" categorySlug={s.primaryCategory?.slug} size="sm" className="relative z-10 mt-auto pt-4 [&>*]:h-9 [&>*]:flex-1" />
            </article>
          </li>
        );
      })}
    </ul>
  );
}
