import Link from "next/link";
import { BadgeCheck, Crown, MapPin } from "lucide-react";
import type { ProviderCard as ProviderCardType } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ContactButtons } from "./contact-buttons";
import { FavoriteButton } from "./favorite-button";
import { OpenStatus } from "./provider-card";
import { ProviderPhoto } from "./provider-photo";
import { RatingInline } from "./rating";

/** A compact vertical provider card for carousels and grids: photo, rating, a few services, and call buttons. */
export function ProviderTile({ provider, source = "search", className }: { provider: ProviderCardType; source?: "search" | "category_browse"; className?: string }) {
  const verified = provider.verificationStatus === "verified";
  const price = formatPrice(provider.startingPrice);
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-[box-shadow,border-color] hover:border-foreground/15 hover:shadow-[var(--shadow-lift)]",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <ProviderPhoto
          name={provider.businessName}
          coverUrl={provider.coverUrl}
          logoUrl={provider.logoUrl}
          categorySlug={provider.primaryCategory?.slug}
          sizes="(min-width: 1024px) 19rem, (min-width: 640px) 45vw, 90vw"
        />
        {provider.planTier ? (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-xs font-semibold text-foreground shadow-sm">
            <Crown className="size-3.5 text-[oklch(0.7_0.15_70)]" fill="currentColor" /> Top partner
          </span>
        ) : verified ? (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-xs font-semibold text-foreground shadow-sm">
            <BadgeCheck className="size-3.5 text-success" /> Verified
          </span>
        ) : null}
        <FavoriteButton providerId={provider.id} initial={provider.isFavorite} className="absolute right-2.5 top-2.5 z-10 size-8 border-0 bg-white/95 shadow-sm hover:bg-white" />
      </div>

      <div className="flex flex-1 flex-col p-4">
        {provider.primaryCategory && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{provider.primaryCategory.name}</p>}
        <h3 className="mt-1 truncate text-base font-bold">
          <Link href={`/providers/${provider.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:text-primary group-hover:underline decoration-1 underline-offset-2">
            {provider.businessName}
          </Link>
        </h3>
        <RatingInline value={provider.avgRating} count={provider.totalReviews} className="mt-1" />
        <div className="mt-3 space-y-1.5 text-sm">
          <div className="flex min-w-0 items-center gap-1.5 text-foreground/80">
            <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{provider.locality ? `${provider.locality}, ${provider.city}` : provider.city}</span>
          </div>
          <OpenStatus provider={provider} className="text-sm" />
        </div>
        <div className="mt-auto pt-4">
          <div className="text-sm">
            {price ? (
              <>
                <span className="text-muted-foreground">From </span>
                <span className="font-bold">{price}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Price on request</span>
            )}
          </div>
        </div>
        <ContactButtons provider={provider} source={source} categorySlug={provider.primaryCategory?.slug} variant="outline" size="sm" className="relative z-10 mt-3 [&>*]:h-9" />
      </div>
    </article>
  );
}
