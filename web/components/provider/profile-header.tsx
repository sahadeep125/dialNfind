import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import type { ProviderDetail } from "@/lib/types";
import { isIndividual, listingParts } from "@/lib/account-type";
import { AccountTypeBadge } from "./account-type-badge";
import { Badge } from "@/components/ui/badge";
import { OpenStatus } from "./provider-card";
import { ProviderAvatar } from "./provider-avatar";
import { RatingStars } from "./rating";

export interface ProfileFact {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}

/** Name, trust badges, rating, main services and a row of key facts at the top of a profile. */
export function ProfileHeader({ p, chips, extraChips, facts }: { p: ProviderDetail; chips: string[]; extraChips: number; facts: ProfileFact[] }) {
  const place = p.locality ? `${p.locality}, ${p.city}` : p.city;
  const individual = isIndividual(p);
  const { middle } = listingParts(p);
  const others = p.otherListings ?? [];
  return (
    <div id="overview" className="scroll-mt-32">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <ProviderAvatar name={p.businessName} logoUrl={p.logoUrl} categorySlug={p.primaryCategory?.slug} size="xl" className="size-16 border bg-card text-2xl sm:size-20 md:size-24 md:text-3xl" />
        <div className="min-w-0 flex-1">
          <AccountTypeBadge type={p.businessType} size="md" />
          <h1 className="mt-2 text-[1.75rem] font-extrabold leading-tight text-foreground md:text-4xl">{p.businessName}</h1>
          {middle && <p className="mt-1 text-lg font-semibold text-foreground/80 md:text-xl">{middle}</p>}
          <p className="mt-1 text-sm text-muted-foreground">
            {individual ? "Works independently. You deal with this professional directly." : "A business. Work may be done by its team."}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px]">
            {p.totalReviews > 0 ? (
              <a href="#reviews" className="inline-flex items-center gap-2 hover:underline">
                <RatingStars value={p.avgRating} size="md" />
                <span className="font-bold">{p.avgRating.toFixed(1)}</span>
                <span className="text-muted-foreground">
                  ({p.totalReviews.toLocaleString("en-IN")} {p.totalReviews === 1 ? "review" : "reviews"})
                </span>
              </a>
            ) : (
              <span className="text-muted-foreground">No reviews yet</span>
            )}
            <span className="inline-flex items-center gap-1.5 text-foreground/80">
              <MapPin className="size-4 text-muted-foreground" aria-hidden /> {place}
            </span>
            <OpenStatus provider={p} className="text-[15px]" />
          </div>

          {(p.verificationStatus === "verified" || p.badges.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {p.verificationStatus === "verified" && (
                <Badge variant="success" className="gap-1 py-1">
                  <BadgeCheck /> {individual ? "Verified professional" : "Verified business"}
                </Badge>
              )}
              {p.badges.map((b) => (
                <Badge key={b.id} variant="warning" className="py-1">
                  {b.name}
                </Badge>
              ))}
            </div>
          )}

          {others.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">Also works as</span>
              {others.map((o) => (
                <Link key={o.slug} href={`/providers/${o.slug}`} className="rounded-md border px-2.5 py-1 font-semibold text-primary hover:bg-muted">
                  {o.profession ?? "Another profession"}
                </Link>
              ))}
            </div>
          )}

          {chips.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Main services">
              {chips.map((c, i) => (
                <li key={c} className={i === 0 ? "rounded-md bg-primary px-2.5 py-1 text-[13px] font-semibold text-primary-foreground" : "rounded-md bg-muted px-2.5 py-1 text-[13px] font-medium text-foreground/80"}>
                  {c}
                </li>
              ))}
              {extraChips > 0 && (
                <li>
                  <a href="#services" className="block rounded-md border px-2.5 py-1 text-[13px] font-semibold text-primary hover:bg-muted">
                    +{extraChips} more
                  </a>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {facts.length > 0 && (
        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
          {facts.map((f) => (
            <div key={f.label} className="flex items-center gap-3 bg-card px-4 py-3.5">
              <f.icon className="size-5 shrink-0 text-cta-strong" aria-hidden />
              <div className="flex min-w-0 flex-col-reverse">
                <dt className="truncate text-xs text-muted-foreground">{f.label}</dt>
                <dd className="truncate text-[15px] font-bold">{f.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
