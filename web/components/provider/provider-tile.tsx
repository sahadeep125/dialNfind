import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import type { ProviderCard as ProviderCardType } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ContactButtons } from "./contact-buttons";
import { FavoriteButton } from "./favorite-button";
import { OpenStatus } from "./provider-card";
import { ProviderAvatar } from "./provider-avatar";
import { ProviderPhoto } from "./provider-photo";
import { RatingInline } from "./rating";
import { AccountTypeBadge } from "./account-type-badge";
import { listingParts } from "@/lib/account-type";

/** A compact vertical provider card for grids: the listing's own photo or its monogram, rating, a few services, and call buttons. */
export function ProviderTile({ provider, source = "search", className }: { provider: ProviderCardType; source?: "search" | "category_browse"; className?: string }) {
  const verified = provider.verificationStatus === "verified";
  const price = formatPrice(provider.startingPrice);
  const { middle } = listingParts(provider);
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[var(--shadow-lift)]",
        className,
      )}
    >
      {provider.coverUrl && (
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <ProviderPhoto
            name={provider.businessName}
            coverUrl={provider.coverUrl}
            logoUrl={provider.logoUrl}
            categorySlug={provider.primaryCategory?.slug}
            sizes="(min-width: 1024px) 19rem, (min-width: 640px) 45vw, 90vw"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          {provider.coverUrl ? (
            <AccountTypeBadge type={provider.businessType} />
          ) : (
            <ProviderAvatar name={provider.businessName} logoUrl={provider.logoUrl} categorySlug={provider.primaryCategory?.slug} />
          )}
          <FavoriteButton providerId={provider.id} initial={provider.isFavorite} className="relative z-10 -mr-1 -mt-1 size-9" />
        </div>
        {!provider.coverUrl && <AccountTypeBadge type={provider.businessType} className="mt-4" />}
        <h3 className="mt-2 flex items-center gap-1.5 text-base font-semibold">
          <Link href={`/providers/${provider.slug}`} className="truncate decoration-1 underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline">
            {provider.businessName}
          </Link>
          {verified && <BadgeCheck className="size-4 shrink-0 fill-success text-white" aria-label="Verified" />}
        </h3>
        {middle && <p className="truncate text-sm text-foreground/75">{middle}</p>}
        {provider.totalReviews > 0 && <RatingInline value={provider.avgRating} count={provider.totalReviews} className="mt-1" />}
        <div className="mt-3 space-y-1.5 text-sm">
          <div className="flex min-w-0 items-center gap-1.5 text-foreground/80">
            <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{provider.locality ? `${provider.locality}, ${provider.city}` : provider.city}</span>
          </div>
          <OpenStatus provider={provider} className="text-sm" />
        </div>
        <div className="mt-auto pt-4 text-sm">
          {price ? (
            <>
              <span className="text-muted-foreground">From </span>
              <span className="font-bold">{price}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Price on request</span>
          )}
        </div>
        <ContactButtons provider={provider} source={source} categorySlug={provider.primaryCategory?.slug} variant="outline" size="sm" className="relative z-10 mt-3 [&>*]:h-10 [&>*]:flex-1" />
      </div>
    </article>
  );
}
