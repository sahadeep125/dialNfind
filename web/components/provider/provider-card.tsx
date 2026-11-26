import Link from "next/link";
import { BadgeCheck, Briefcase, MapPin } from "lucide-react";
import type { ProviderCard as ProviderCardType } from "@/lib/types";
import { formatDistance, formatKm, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ContactButtons } from "./contact-buttons";
import { FavoriteButton } from "./favorite-button";
import { ProviderAvatar } from "./provider-avatar";
import { ProviderPhoto } from "./provider-photo";
import { RatingInline } from "./rating";
import { listingParts } from "@/lib/account-type";

export function OpenStatus({
  provider,
  compact = false,
  onDark = false,
  className,
}: {
  provider: Pick<ProviderCardType, "isOpenNow" | "isAvailable" | "todayHours"> & { hasHours?: boolean };
  /** Just "Open now" or "Closed", without today's hours; nothing when no hours are listed. */
  compact?: boolean;
  /** Lighter status colours for navy boards. */
  onDark?: boolean;
  className?: string;
}) {
  if (!provider.isAvailable) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", onDark ? "text-board-muted" : "text-muted-foreground", className)}>
        <span className="size-2 rounded-full bg-current opacity-60" />
        Currently unavailable
      </span>
    );
  }
  // No hours listed: say nothing rather than calling the place closed or filling the card with "not listed".
  if (provider.hasHours === false) return null;
  const closedAllDay = provider.todayHours === "Closed";
  const open = provider.isOpenNow;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", className)}>
      <span className={cn("size-2 rounded-full", open ? "bg-success" : "bg-destructive", onDark && (open ? "bg-[#4ade80]" : "bg-[#ff8a75]"))} />
      <span className={onDark ? (open ? "text-[#86efac]" : "text-[#ffb4a6]") : open ? "text-success-ink" : "text-danger-ink"}>
        {open ? "Open now" : closedAllDay ? "Closed today" : "Closed"}
      </span>
      {!closedAllDay && !compact && <span className={cn("font-normal tabular-nums", onDark ? "text-board-muted" : "text-muted-foreground")}>· {provider.todayHours}</span>}
    </span>
  );
}

const PRICE_UNIT_LABEL: Record<string, string> = { per_visit: "per visit", per_hour: "per hour", fixed: "fixed price" };

/** A search result row: logo or monogram (a real cover photo when the listing has one), trust facts, services, starting price and contact buttons. It lays itself out by its own width, so it works in lists and grids. */
export function ProviderCard({
  provider,
  source = "search",
  highlight, 
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
  // "Deep Saha – Plumber – Ghoraguli" or "ABC Services – Plumbing & Electrical – Siliguri".
  const { middle, area } = listingParts(provider);
  return (
    <article
      className={cn(
        "@container group relative rounded-xl border border-border/70 bg-card p-4 shadow-[var(--shadow-card)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-4 @2xl:flex-row @2xl:items-stretch">
        <div className="flex min-w-0 flex-1 gap-4">
          {/* The listing's own photo or logo; a monogram when it has neither. Never a stock picture passed off as theirs. */}
          {provider.coverUrl ? (
            <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted @lg:size-24 @2xl:h-28 @2xl:w-36">
              <ProviderPhoto name={provider.businessName} coverUrl={provider.coverUrl} logoUrl={provider.logoUrl} categorySlug={provider.primaryCategory?.slug} sizes="144px" />
            </div>
          ) : (
            <ProviderAvatar name={provider.businessName} logoUrl={provider.logoUrl} categorySlug={provider.primaryCategory?.slug} size="lg" className="size-12 text-base @lg:size-20 @lg:text-2xl" />
          )}

          <div className="min-w-0 flex-1 pr-9 @2xl:pr-0">
            <div className="flex items-center gap-1.5">
              <h3 className="min-w-0 text-lg font-semibold leading-snug">
                <Link href={href} className="line-clamp-1 decoration-1 underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline">
                  {provider.businessName}
                </Link>
              </h3>
              {verified && <BadgeCheck className="size-5 shrink-0 fill-success text-white" aria-label="Verified" />}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="min-w-0 truncate text-sm text-foreground/80">
                {middle && <span>{middle}</span>}
                {middle && area && <span className="text-muted-foreground"> – </span>}
                <span className="text-muted-foreground">{area}</span>
              </p>
            </div>

            {(provider.totalReviews > 0 || provider.yearsExperience) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                {provider.totalReviews > 0 && <RatingInline value={provider.avgRating} count={provider.totalReviews} />}
                {provider.yearsExperience ? (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Briefcase className="size-3.5" aria-hidden /> {provider.yearsExperience}+ yrs
                  </span>
                ) : null}
              </div>
            )}

            {provider.shortDescription && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground/75">{provider.shortDescription}</p>}

            {tags.length > 0 && (
              <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Services">
                {tags.slice(0, 3).map((s, i) => (
                  <li key={s} className={cn("rounded px-2 py-0.5 text-xs", i === 0 && highlight ? "bg-cta-soft font-medium text-cta-strong" : "bg-muted text-foreground/75")}>
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
                  {distance && <span className="text-muted-foreground @2xl:hidden"> · {distance}</span>}
                </span>
              </span>
              <OpenStatus provider={provider} className="text-sm" />
            </div>
          </div>
        </div>

        {/* Distance and price, then contact. Distance first: "how close?" is the question people compare on. */}
        <div className="flex shrink-0 flex-col gap-3 border-t pt-4 @2xl:w-64 @2xl:justify-between @2xl:border-l @2xl:border-t-0 @2xl:pl-5 @2xl:pt-0">
          <div className="flex items-baseline justify-between gap-3 empty:hidden @2xl:block @2xl:pr-11 @2xl:text-right">
            {provider.distanceKm !== null && provider.distanceKm !== undefined && (
              <div className="hidden @2xl:block">
                <span className="font-display text-xl font-bold leading-tight">{formatKm(provider.distanceKm)}</span>
                <span className="ml-1 text-sm text-muted-foreground">away</span>
              </div>
            )}
            {price && (
              <div className="text-sm @2xl:mt-1">
                <span className="text-muted-foreground">From </span>
                <span className="font-semibold tabular-nums">{price}</span>
                {provider.priceUnit && <span className="text-muted-foreground"> {PRICE_UNIT_LABEL[provider.priceUnit]}</span>}
              </div>
            )}
          </div>
          <ContactButtons provider={provider} source={source} categorySlug={provider.primaryCategory?.slug} layout="row" className="relative z-10" />
        </div>
      </div>
      <FavoriteButton providerId={provider.id} initial={provider.isFavorite} className="absolute right-3 top-3 z-10 size-9 sm:right-4 sm:top-4" />
    </article>
  );
}
