import Link from "next/link";
import { BadgeCheck, Clock, MapPin } from "lucide-react";
import type { ProviderDetail } from "@/lib/types";
import { isIndividual, listingParts } from "@/lib/account-type";
import { AccountTypeBadge } from "./account-type-badge";
import { Badge } from "@/components/ui/badge";
import { DistanceFromYou } from "./distance-from-you";
import { OpenStatus } from "./provider-card";
import { ProviderAvatar } from "./provider-avatar";
import { RatingStars } from "./rating";

export interface ProfileFact {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}

/** The full postal address, or the locality and city when no street address is listed. */
export function fullAddress(p: Pick<ProviderDetail, "addressLine" | "locality" | "city" | "state" | "pincode">): string {
  const line = p.addressLine?.trim().replace(/[.,\s]+$/, "") ?? "";
  // Imported addresses often end in the city already: "…, Sevoke Road, Siliguri".
  const city = line.toLowerCase().includes(p.city.toLowerCase()) ? null : p.city;
  const parts = line ? [line, city, [p.state, p.pincode].filter(Boolean).join(" ")] : [p.locality, p.city, p.state];
  return Array.from(new Set(parts.filter(Boolean).map((s) => String(s).trim()))).join(", ");
}

/**
 * The top of a profile: who this is, what they do, where they are, how far away, and whether they are open.
 * Everything a visitor needs before deciding to call, with nothing they would have to skip past.
 */
export function ProfileHeader({ p, chips, extraChips, facts, actions }: { p: ProviderDetail; chips: string[]; extraChips: number; facts: ProfileFact[]; actions?: React.ReactNode }) {
  const place = p.locality ? `${p.locality}, ${p.city}` : p.city;
  const individual = isIndividual(p);
  const { middle } = listingParts(p);
  const others = p.otherListings ?? [];
  const hasHours = p.is24x7 || p.hours.some((h) => h.openTime);
  return (
    <div id="overview" className="scroll-mt-32">
      <div className="flex items-start gap-4 sm:gap-6">
        <ProviderAvatar
          name={p.businessName}
          logoUrl={p.logoUrl}
          categorySlug={p.primaryCategory?.slug}
          size="xl"
          className="size-[4.5rem] border bg-card text-2xl sm:size-24 md:size-28 md:text-4xl"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <AccountTypeBadge type={p.businessType} size="md" />
            {p.verificationStatus === "verified" && (
              <Badge variant="success" className="gap-1">
                <BadgeCheck /> {individual ? "Verified professional" : "Verified business"}
              </Badge>
            )}
            {p.is24x7 && <Badge variant="warning">24x7 emergency</Badge>}
          </div>
          <h1 className="mt-2 text-[1.75rem] font-bold leading-[1.1] tracking-[-0.025em] text-foreground md:text-[2.5rem]">{p.businessName}</h1>
          <p className="mt-1.5 text-base font-medium text-foreground/80 md:text-lg">
            {middle ?? "Local services"} <span className="font-normal text-muted-foreground">in {place}</span>
          </p>
        </div>
      </div>

      <ul className="mt-5 space-y-2.5 text-[15px]">
        <li className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <a href="#location" className="decoration-1 hover:underline">
            {fullAddress(p)}
          </a>
        </li>
        {hasHours && p.isAvailable && (
          <li className="flex items-center gap-2.5">
            <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            {p.is24x7 ? <span className="font-medium">Open 24 hours, every day</span> : <OpenStatus provider={{ ...p, hasHours: true }} className="text-[15px]" />}
          </li>
        )}
        {!p.isAvailable && (
          <li>
            <OpenStatus provider={p} />
          </li>
        )}
        <li className="empty:hidden">
          <DistanceFromYou lat={p.latitude} lng={p.longitude} className="text-[15px]" />
        </li>
        {p.totalReviews > 0 && (
          <li>
            <a href="#reviews" className="inline-flex items-center gap-2 hover:underline">
              <RatingStars value={p.avgRating} size="md" />
              <span className="font-bold tabular-nums">{p.avgRating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({p.totalReviews.toLocaleString("en-IN")} {p.totalReviews === 1 ? "review" : "reviews"})
              </span>
            </a>
          </li>
        )}
      </ul>

      {actions}

      {(chips.length > 0 || p.badges.length > 0) && (
        <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Main services">
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
          {p.badges.map((b) => (
            <li key={b.id} className="rounded-md bg-warning-soft px-2.5 py-1 text-[13px] font-semibold text-warning-ink">
              {b.name}
            </li>
          ))}
        </ul>
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

      {facts.length > 0 && (
        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
          {facts.map((f) => (
            <div key={f.label} className="flex items-center gap-3 bg-card px-4 py-3">
              <f.icon className="size-5 shrink-0 text-cta-strong" aria-hidden />
              <div className="flex min-w-0 flex-col-reverse">
                <dt className="truncate text-xs text-muted-foreground">{f.label}</dt>
                <dd className="truncate text-[15px] font-bold tabular-nums">{f.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
