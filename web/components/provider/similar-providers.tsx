import Link from "next/link";
import { MapPin } from "lucide-react";
import type { ProviderCard } from "@/lib/types";
import { formatDistance } from "@/lib/format";
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
              className="group block overflow-hidden rounded-lg border bg-card transition-[box-shadow,border-color] hover:border-foreground/15 hover:shadow-[var(--shadow-lift)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <ProviderPhoto name={s.businessName} coverUrl={s.coverUrl} logoUrl={s.logoUrl} categorySlug={s.primaryCategory?.slug} sizes="(min-width: 768px) 16rem, 45vw" />
              </div>
              <div className="p-3">
                <div className="truncate text-sm font-bold group-hover:text-primary group-hover:underline">{s.businessName}</div>
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
