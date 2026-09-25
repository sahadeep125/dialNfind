import Link from "next/link";
import { BadgeCheck, Clock, MapPin, Megaphone } from "lucide-react";
import type { ProviderCard as ProviderCardType } from "@/lib/types";
import { formatDistance, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProviderAvatar } from "./provider-avatar";
import { RatingPill } from "./rating";
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

export function ProviderCard({
  provider,
  source = "search",
  highlight,
  className,
}: {
  provider: ProviderCardType;
  source?: "search" | "category_browse" | "profile";
  highlight?: string;
  className?: string;
}) {
  const distance = formatDistance(provider.distanceKm);
  const price = formatPrice(provider.startingPrice, provider.priceUnit);
  const href = `/providers/${provider.slug}`;
  const tags = highlight ? [highlight, ...provider.subcategories.filter((s) => s !== highlight)] : provider.subcategories;
  return (
    <article
      className={cn(
        "group relative flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-lift)]",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <ProviderAvatar name={provider.businessName} logoUrl={provider.logoUrl} categorySlug={provider.primaryCategory?.slug} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 font-display text-lg font-bold leading-snug">
              <Link href={href} className="after:absolute after:inset-0 after:content-[''] hover:text-primary">
                {provider.businessName}
              </Link>
            </h3>
            <FavoriteButton providerId={provider.id} initial={provider.isFavorite} className="relative z-10 -mr-1 -mt-1" />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground/80">{provider.primaryCategory?.name}</span>
            {provider.verificationStatus === "verified" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <BadgeCheck className="size-4" /> Verified
              </span>
            )}
            {provider.planTier && <PlanTierBadge tier={provider.planTier} />}
            {provider.isSponsored && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Megaphone className="size-3.5" /> Sponsored
              </span>
            )}
          </div>
          <RatingPill value={provider.avgRating} count={provider.totalReviews} className="mt-2" />
        </div>
      </div>

      {provider.shortDescription && <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{provider.shortDescription}</p>}

      <div className="flex flex-wrap gap-1.5">
        {tags.slice(0, 3).map((s) => (
          <Badge key={s} variant="secondary" className="font-normal">
            {s}
          </Badge>
        ))}
      </div>

      <div className="grid gap-2 text-sm">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <MapPin className="size-4 shrink-0 text-primary/70" />
          <span className="truncate">
            {provider.locality ? `${provider.locality}, ${provider.city}` : provider.city}
            {distance && <span className="font-medium text-foreground"> · {distance}</span>}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-4 shrink-0 text-primary/70" />
          <OpenStatus provider={provider} />
        </span>
      </div>

      <div className="mt-auto flex flex-col gap-3 border-t pt-4">
        <div className="text-sm">
          {price ? (
            <>
              <span className="text-muted-foreground">From </span>
              <span className="font-semibold">{price}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Price on request</span>
          )}
          {provider.yearsExperience ? <span className="text-muted-foreground"> · {provider.yearsExperience} yrs exp.</span> : null}
        </div>
        <ContactButtons
          provider={provider}
          source={source}
          categorySlug={provider.primaryCategory?.slug}
          size="sm"
          className="relative z-10"
        />
      </div>
    </article>
  );
}
