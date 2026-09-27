import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, MapPin, Megaphone, ShieldCheck, Star } from "lucide-react";
import type { ProviderCard as ProviderCardType } from "@/lib/types";
import { formatDistance, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isOptimizableImage } from "@/lib/image-hosts";
import { Badge } from "@/components/ui/badge";
import { categoryTone } from "@/components/site/category-icon";
import { ProviderAvatar } from "./provider-avatar";
import { ContactButtons } from "./contact-buttons";
import { FavoriteButton } from "./favorite-button";
import { PlanTierBadge } from "./plan-tier-badge";

export function OpenStatus({ provider, className }: { provider: Pick<ProviderCardType, "isOpenNow" | "isAvailable" | "todayHours">; className?: string }) {
  if (!provider.isAvailable) {
    return <Badge variant="muted" className={className}>Currently unavailable</Badge>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)}>
      <span className={cn("size-2 rounded-full", provider.isOpenNow ? "bg-success" : "bg-[oklch(0.7_0.15_25)]")} />
      <span className={provider.isOpenNow ? "text-[oklch(0.45_0.11_165)]" : "text-[oklch(0.52_0.15_25)]"}>{provider.isOpenNow ? "Open now" : "Closed"}</span>
      <span className="text-muted-foreground">· {provider.todayHours}</span>
    </span>
  );
}

const PRICE_UNIT_LABEL: Record<string, string> = { per_visit: "per visit", per_hour: "per hour", fixed: "fixed" };

/** A result row: photo, key facts, starting price and contact buttons. It lays itself out by its own width, so it works in lists and grids. */
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
  const distance = formatDistance(provider.distanceKm)?.replace(" away", "");
  const price = formatPrice(provider.startingPrice);
  const href = `/providers/${provider.slug}`;
  const tags = highlight ? [highlight, ...provider.subcategories.filter((s) => s !== highlight)] : provider.subcategories;
  const tone = categoryTone(provider.primaryCategory?.slug);
  return (
    <article className={cn("@container group relative card-surface p-3 transition-shadow hover:shadow-[var(--shadow-lift)]", className)}>
      <div className="flex flex-col gap-4 @2xl:flex-row @2xl:items-stretch">
        {/* Photo */}
        <div className="relative aspect-[2/1] shrink-0 overflow-hidden rounded-lg bg-muted @2xl:aspect-auto @2xl:h-auto @2xl:min-h-36 @2xl:w-48 @4xl:w-60">
          {provider.coverUrl ? (
            <Image
              src={provider.coverUrl}
              alt=""
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              sizes="(min-width: 768px) 240px, 100vw"
              unoptimized={!isOptimizableImage(provider.coverUrl)}
            />
          ) : (
            <div className={cn("flex size-full items-center justify-center", tone.bg)}>
              <ProviderAvatar name={provider.businessName} logoUrl={provider.logoUrl} categorySlug={provider.primaryCategory?.slug} className="rounded-full ring-4 ring-white/70" />
            </div>
          )}
          {topMatch && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
              <ShieldCheck className="size-3.5" /> Top Match
            </span>
          )}
          <FavoriteButton providerId={provider.id} initial={provider.isFavorite} className="absolute right-2 top-2 z-10 border-0 bg-white/95 shadow-sm hover:bg-white" />
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1 @2xl:py-1">
          <h3 className="flex items-center gap-1.5 text-lg font-semibold leading-snug">
            <Link href={href} className="truncate after:absolute after:inset-0 after:content-[''] hover:text-primary">
              {provider.businessName}
            </Link>
            {provider.verificationStatus === "verified" && <BadgeCheck className="size-5 shrink-0 fill-primary text-white" aria-label="Verified" />}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {provider.totalReviews > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Star className="size-4 text-warning" fill="currentColor" strokeWidth={0} />
                <span className="font-semibold text-[oklch(0.6_0.14_70)]">{provider.avgRating.toFixed(1)}</span>({provider.totalReviews.toLocaleString("en-IN")} reviews)
              </span>
            ) : (
              <span className="font-medium">New listing</span>
            )}
            {provider.yearsExperience ? (
              <>
                <span aria-hidden>•</span>
                <span>{provider.yearsExperience}+ years experience</span>
              </>
            ) : null}
          </div>

          {(provider.verificationStatus === "verified" || provider.planTier || provider.isSponsored) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {provider.verificationStatus === "verified" && (
                <Badge variant="success" className="rounded-md">
                  <BadgeCheck /> Verified
                </Badge>
              )}
              {provider.planTier && <PlanTierBadge tier={provider.planTier} className="rounded-md py-0.5 text-xs" />}
              {provider.isSponsored && (
                <Badge variant="soft" className="rounded-md">
                  <Megaphone /> Sponsored
                </Badge>
              )}
            </div>
          )}

          {tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map((s) => (
                <span key={s} className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground/70">
                  {s}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2.5 space-y-1 text-sm">
            <div className="flex min-w-0 items-center gap-1.5 text-foreground/75">
              <MapPin className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {distance && <span>{distance} • </span>}
                {provider.locality ? `${provider.locality}, ${provider.city}` : provider.city}
              </span>
            </div>
            <OpenStatus provider={provider} className="text-sm [&>span:first-child]:size-2.5" />
          </div>
        </div>

        {/* Price + contact */}
        <div className="flex shrink-0 flex-col justify-between gap-3 border-t pt-3 @2xl:w-44 @4xl:w-52 @2xl:border-t-0 @2xl:pt-0">
          <div className="rounded-lg border px-3 py-2 text-center @2xl:mx-auto @2xl:w-28">
            {price ? (
              <>
                <div className="text-xl font-bold leading-tight">{price}</div>
                <div className="text-xs text-muted-foreground">Starting price</div>
                {provider.priceUnit && <div className="text-[11px] text-muted-foreground">({PRICE_UNIT_LABEL[provider.priceUnit]})</div>}
              </>
            ) : (
              <div className="py-1.5 text-sm font-medium text-muted-foreground">Price on request</div>
            )}
          </div>
          <ContactButtons provider={provider} source={source} categorySlug={provider.primaryCategory?.slug} className="relative z-10" />
        </div>
      </div>
    </article>
  );
}
