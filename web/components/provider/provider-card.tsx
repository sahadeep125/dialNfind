import Link from "next/link";
import { BadgeCheck, Briefcase, ChevronRight, MapPin, Megaphone, Trophy } from "lucide-react";
import type { ProviderCard as ProviderCardType } from "@/lib/types";
import { formatDistance, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ContactButtons } from "./contact-buttons";
import { FavoriteButton } from "./favorite-button";
import { PlanTierBadge } from "./plan-tier-badge";
import { ProviderPhoto } from "./provider-photo";
import { RatingInline } from "./rating";

export function OpenStatus({ provider, className }: { provider: Pick<ProviderCardType, "isOpenNow" | "isAvailable" | "todayHours">; className?: string }) {
  if (!provider.isAvailable) {
    return <Badge variant="muted" className={className}>Currently unavailable</Badge>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)}>
      <span className={cn("size-2 rounded-full", provider.isOpenNow ? "bg-success" : "bg-[oklch(0.65_0.16_27)]")} />
      <span className={provider.isOpenNow ? "text-[oklch(0.42_0.11_155)]" : "text-[oklch(0.5_0.16_27)]"}>{provider.isOpenNow ? "Open now" : "Closed"}</span>
      <span className="font-normal text-muted-foreground">· {provider.todayHours}</span>
    </span>
  );
}

const PRICE_UNIT_LABEL: Record<string, string> = { per_visit: "per visit", per_hour: "per hour", fixed: "fixed price" };

/** A search result row: photo, trust facts, services, starting price and contact buttons. It lays itself out by its own width, so it works in lists and grids. */
export function ProviderCard({
  provider,
  source = "search",
  highlight,
  topMatch = false,
  className,
}: {
  provider: ProviderCardType;
  source?: "search" | "category_browse" | "profile";
  highlight?: string;
  /** Marks the best result with a small ribbon. */
  topMatch?: boolean;
  className?: string;
}) {
  const distance = formatDistance(provider.distanceKm);
  const price = formatPrice(provider.startingPrice);
  const href = `/providers/${provider.slug}`;
  const tags = highlight ? [highlight, ...provider.subcategories.filter((s) => s !== highlight)] : provider.subcategories;
  const verified = provider.verificationStatus === "verified";
  const place = provider.locality ? `${provider.locality}, ${provider.city}` : provider.city;
  return (
    <article
      className={cn(
        "@container group relative rounded-lg border bg-card p-3 transition-[box-shadow,border-color] hover:border-foreground/15 hover:shadow-[var(--shadow-lift)] sm:p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-4 @2xl:flex-row">
        {/* Photo */}
        <div className="relative aspect-[16/9] shrink-0 overflow-hidden rounded-md bg-muted @2xl:aspect-[4/3] @2xl:w-52 @4xl:w-60 @2xl:self-start">
          <ProviderPhoto
            name={provider.businessName}
            coverUrl={provider.coverUrl}
            logoUrl={provider.logoUrl}
            categorySlug={provider.primaryCategory?.slug}
            sizes="(min-width: 768px) 240px, 100vw"
          />
          {(topMatch || provider.isSponsored) && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-xs font-semibold text-foreground shadow-sm">
              {topMatch ? (
                <>
                  <Trophy className="size-3.5 text-cta" /> Top match
                </>
              ) : (
                <>
                  <Megaphone className="size-3.5 text-muted-foreground" /> Sponsored
                </>
              )}
            </span>
          )}
          <FavoriteButton providerId={provider.id} initial={provider.isFavorite} className="absolute right-2 top-2 z-10 size-8 border-0 bg-white/95 shadow-sm hover:bg-white" />
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="min-w-0 text-lg font-bold leading-snug">
              <Link href={href} className="line-clamp-1 after:absolute after:inset-0 after:content-[''] group-hover:text-primary group-hover:underline decoration-1 underline-offset-2">
                {provider.businessName}
              </Link>
            </h3>
            {verified && <BadgeCheck className="size-5 shrink-0 fill-success text-white" aria-label="Verified" />}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <RatingInline value={provider.avgRating} count={provider.totalReviews} />
            {provider.yearsExperience ? (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Briefcase className="size-3.5" aria-hidden /> {provider.yearsExperience}+ yrs
              </span>
            ) : null}
            {provider.planTier && <PlanTierBadge tier={provider.planTier} />}
          </div>

          {provider.shortDescription && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground/75">{provider.shortDescription}</p>}

          {tags.length > 0 && (
            <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Services">
              {tags.slice(0, 3).map((s, i) => (
                <li key={s} className={cn("rounded-md px-2 py-0.5 text-xs", i === 0 && highlight ? "bg-cta-soft font-medium text-cta-hover" : "bg-muted text-foreground/75")}>
                  {s}
                </li>
              ))}
              {tags.length > 3 && <li className="px-1 py-0.5 text-xs text-muted-foreground">+{tags.length - 3} more</li>}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            <span className="flex min-w-0 items-center gap-1.5 text-foreground/80">
              <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate">
                {place}
                {distance && <span className="text-muted-foreground"> · {distance}</span>}
              </span>
            </span>
            <OpenStatus provider={provider} className="text-sm" />
          </div>
        </div>

        {/* Price + contact */}
        <div className="flex shrink-0 flex-col gap-3 border-t pt-3 @2xl:w-44 @2xl:border-l @2xl:border-t-0 @2xl:pl-4 @2xl:pt-0 @4xl:w-48">
          <div className="@2xl:text-right">
            {price ? (
              <>
                <div className="text-xs text-muted-foreground">Starting from</div>
                <div className="text-xl font-bold leading-tight">
                  {price}
                  {provider.priceUnit && <span className="ml-1 text-xs font-normal text-muted-foreground">{PRICE_UNIT_LABEL[provider.priceUnit]}</span>}
                </div>
              </>
            ) : (
              <div className="text-sm font-medium text-muted-foreground">Price on request</div>
            )}
          </div>
          <ContactButtons provider={provider} source={source} categorySlug={provider.primaryCategory?.slug} layout="stack" className="relative z-10 mt-auto @max-2xl:flex-row @max-2xl:[&>*]:flex-1" />
          <span className="hidden items-center justify-end gap-0.5 text-xs font-semibold text-primary @2xl:flex" aria-hidden>
            View profile <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
