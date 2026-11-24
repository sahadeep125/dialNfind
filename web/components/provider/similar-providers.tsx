import Link from "next/link";
import { MapPin, Building2, UserRound } from "lucide-react";
import type { ProviderCard } from "@/lib/types";
import { formatDistance } from "@/lib/format";
import { ProviderAvatar } from "./provider-avatar";
import { ProviderPhoto } from "./provider-photo";
import { RatingInline } from "./rating";

/** Small linked cards for other pros nearby in the same category. */
export function SimilarProviders({ providers }: { providers: ProviderCard[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {providers.map((s) => {
        const distance = formatDistance(s.distanceKm);
        return (
          <li key={s.id}>
            <Link
              href={`/providers/${s.slug}`}
              className="group block h-full overflow-hidden rounded-lg border bg-card transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[var(--shadow-lift)]"
            >
              {s.coverUrl && (
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  <ProviderPhoto name={s.businessName} coverUrl={s.coverUrl} logoUrl={s.logoUrl} categorySlug={s.primaryCategory?.slug} sizes="(min-width: 768px) 16rem, 45vw" />
                </div>
              )}
              <div className="p-4">
                {!s.coverUrl && <ProviderAvatar name={s.businessName} logoUrl={s.logoUrl} categorySlug={s.primaryCategory?.slug} className="mb-3" />}
                <div className="truncate text-sm font-semibold decoration-1 underline-offset-4 group-hover:underline">{s.businessName}</div>
                <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-foreground/75">
                  {s.businessType === "individual" ? <UserRound className="size-3 shrink-0 text-cta-strong" aria-label="Individual professional" /> : <Building2 className="size-3 shrink-0 text-primary" aria-label="Business" />}
                  <span className="truncate">{(s.businessType === "individual" ? s.profession : s.categoryLabel) ?? s.primaryCategory?.name}</span>
                </div>
                <RatingInline value={s.avgRating} count={s.totalReviews} short className="mt-1 text-xs [&>svg]:size-3.5" />
                <div className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <MapPin className="size-3 shrink-0" aria-hidden /> {distance ?? s.locality ?? s.city}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
