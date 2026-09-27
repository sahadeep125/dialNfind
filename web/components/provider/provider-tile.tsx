import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Crown, MapPin, Star } from "lucide-react";
import type { ProviderCard as ProviderCardType } from "@/lib/types";
import { isOptimizableImage } from "@/lib/image-hosts";
import { cn } from "@/lib/utils";
import { categoryTone } from "@/components/site/category-icon";
import { ProviderAvatar } from "./provider-avatar";
import { ContactButtons } from "./contact-buttons";
import { FavoriteButton } from "./favorite-button";
import { OpenStatus } from "./provider-card";

/** A compact vertical provider card for carousels and grids: photo, rating, a few services, and call buttons. */
export function ProviderTile({ provider, source = "search", className }: { provider: ProviderCardType; source?: "search" | "category_browse"; className?: string }) {
  const tone = categoryTone(provider.primaryCategory?.slug);
  const verified = provider.verificationStatus === "verified";
  return (
    <article className={cn("card-surface group relative flex flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)]", className)}>
      <div className="relative aspect-[16/10] bg-muted">
        {provider.coverUrl ? (
          <Image
            src={provider.coverUrl}
            alt=""
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(min-width: 1280px) 22rem, (min-width: 640px) 45vw, 90vw"
            unoptimized={!isOptimizableImage(provider.coverUrl)}
          />
        ) : (
          <div className={cn("flex size-full items-center justify-center", tone.bg)}>
            <ProviderAvatar name={provider.businessName} logoUrl={provider.logoUrl} categorySlug={provider.primaryCategory?.slug} className="rounded-full ring-4 ring-white/70" />
          </div>
        )}
        {provider.planTier ? (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-warning-soft px-2 py-1 text-xs font-semibold text-[oklch(0.45_0.1_60)] shadow-sm">
            <Crown className="size-3.5 text-[oklch(0.7_0.15_70)]" fill="currentColor" /> Top Partner
          </span>
        ) : verified ? (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-success px-2 py-1 text-xs font-semibold text-white shadow-sm">
            <BadgeCheck className="size-3.5" /> Verified
          </span>
        ) : null}
        <FavoriteButton providerId={provider.id} initial={provider.isFavorite} className="absolute right-2.5 top-2.5 z-10 border-0 bg-white/95 shadow-sm hover:bg-white" />
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="truncate text-[17px] font-semibold">
          <Link href={`/providers/${provider.slug}`} className="after:absolute after:inset-0 after:content-[''] hover:text-primary">
            {provider.businessName}
          </Link>
        </h3>
        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          {provider.totalReviews > 0 ? (
            <>
              <Star className="size-4 text-warning" fill="currentColor" strokeWidth={0} />
              <span className="font-semibold text-[oklch(0.6_0.14_70)]">{provider.avgRating.toFixed(1)}</span>({provider.totalReviews.toLocaleString("en-IN")} reviews)
            </>
          ) : (
            <span className="font-medium">New listing</span>
          )}
        </div>
        {provider.subcategories.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {provider.subcategories.slice(0, 3).map((s) => (
              <span key={s} className="max-w-full truncate rounded-md bg-muted px-2 py-0.5 text-xs text-foreground/70">
                {s}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex min-w-0 items-center gap-1.5 text-foreground/75">
            <MapPin className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{provider.locality ? `${provider.locality}, ${provider.city}` : provider.city}</span>
          </div>
          <OpenStatus provider={provider} className="text-sm [&>span:first-child]:size-2.5" />
        </div>
        <ContactButtons provider={provider} source={source} categorySlug={provider.primaryCategory?.slug} variant="outline" className="relative z-10 mt-auto pt-3.5" />
      </div>
    </article>
  );
}
