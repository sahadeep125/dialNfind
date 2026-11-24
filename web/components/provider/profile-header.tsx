import Link from "next/link";
import { BadgeCheck, Clock, MapPin } from "lucide-react";
import type { ProviderDetail } from "@/lib/types";
import { isIndividual, listingParts } from "@/lib/account-type";
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
 * The signboard at the top of a profile: who this is, what they do, where they are, how far away, and whether
 * they are open, painted on the navy board like the sign over a shop. Facts sit in a ledger on the right on
 * wide screens. Everything a visitor needs before deciding to call, with nothing they would have to skip past.
 */
export function ProfileHeader({
  p,
  chips,
  extraChips,
  facts,
  actions,
  top,
}: {
  p: ProviderDetail;
  chips: string[];
  extraChips: number;
  facts: ProfileFact[];
  actions?: React.ReactNode;
  /** The breadcrumb row, painted on the same board. */
  top?: React.ReactNode;
}) {
  const place = p.locality ? `${p.locality}, ${p.city}` : p.city;
  const individual = isIndividual(p);
  const { middle } = listingParts(p);
  const others = p.otherListings ?? [];
  const hasHours = p.is24x7 || p.hours.some((h) => h.openTime);
  return (
    <div id="overview" className="scroll-mt-32 bg-board text-board-foreground">
      <div className="container-wide pb-8 pt-3 md:pb-12">
        {top}
        {/* On wide screens the contact ticket overlaps the right of the board, so the sign keeps clear of it. */}
        <div className="mt-6 md:mt-8 lg:pr-[24rem] xl:pr-[27rem]">
          <div className="min-w-0">
            {/* The name plate: trade and para in orange, like the strip over a shop front. */}
            <p className="inline-flex max-w-full items-center gap-2 rounded-sm bg-cta px-2.5 py-1 text-[13px] font-bold uppercase tracking-[0.06em] text-cta-foreground">
              <span className="truncate">{middle ?? "Local services"}</span>
              <span aria-hidden>·</span>
              <span className="truncate">{p.locality ?? p.city}</span>
            </p>
            <div className="mt-4 flex items-start gap-4 sm:gap-6">
              <ProviderAvatar
                name={p.businessName}
                logoUrl={p.logoUrl}
                categorySlug={p.primaryCategory?.slug}
                size="xl"
                className="size-16 border-0 bg-white text-xl text-board ring-4 ring-white/10 sm:size-24 md:text-4xl"
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-[2rem] font-bold leading-[1.02] tracking-[-0.035em] text-white text-balance">{p.businessName}</h1>
                <p className="mt-2 text-base text-board-muted md:text-lg">
                  <span className="font-semibold text-white">{middle ?? "Local services"}</span> in {place}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2"> 
                  {p.verificationStatus === "verified" && (
                    <Badge variant="success" className="gap-1">
                      <BadgeCheck /> {individual ? "Verified professional" : "Verified business"}
                    </Badge>
                  )}
                  {p.is24x7 && <Badge variant="warning">24x7 emergency</Badge>}
                </div>
              </div>
            </div>

            <ul className="mt-6 space-y-2.5 border-t border-dashed border-board-rule pt-5 text-[15px]">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-cta" aria-hidden />
                <a href="#location" className="decoration-1 underline-offset-4 hover:underline">
                  {fullAddress(p)}
                </a>
              </li>
              {hasHours && p.isAvailable && (
                <li className="flex items-center gap-2.5">
                  <Clock className="size-4 shrink-0 text-cta" aria-hidden />
                  {p.is24x7 ? <span className="font-medium">Open 24 hours, every day</span> : <OpenStatus provider={{ ...p, hasHours: true }} onDark className="text-[15px]" />}
                </li>
              )}
              {!p.isAvailable && (
                <li>
                  <OpenStatus provider={p} onDark />
                </li>
              )}
              <li className="empty:hidden">
                <DistanceFromYou lat={p.latitude} lng={p.longitude} onDark className="text-[15px]" />
              </li>
              {p.totalReviews > 0 && (
                <li>
                  <a href="#reviews" className="inline-flex items-center gap-2 hover:underline">
                    <RatingStars value={p.avgRating} size="md" />
                    <span className="font-bold tabular-nums">{p.avgRating.toFixed(1)}</span>
                    <span className="text-board-muted">
                      ({p.totalReviews.toLocaleString("en-IN")} {p.totalReviews === 1 ? "review" : "reviews"})
                    </span>
                  </a>
                </li>
              )}
            </ul>

            {actions}

            {/* One chip would only repeat the name plate, so the row shows when there is more to say. */}
            {(chips.length > 1 || extraChips > 0 || p.badges.length > 0) && (
              <ul className="mt-6 flex flex-wrap gap-1.5" aria-label="Main services">
                {chips.map((c, i) => (
                  <li
                    key={c}
                    className={
                      i === 0
                        ? "rounded-full bg-white px-3 py-1 text-[13px] font-bold text-board"
                        : "rounded-full border border-white/25 px-3 py-1 text-[13px] font-medium text-white/90"
                    }
                  >
                    {c}
                  </li>
                ))}
                {extraChips > 0 && (
                  <li>
                    <a href="#services" className="block rounded-full px-2 py-1 text-[13px] font-semibold text-cta underline-offset-4 hover:underline">
                      +{extraChips} more
                    </a>
                  </li>
                )}
                {p.badges.map((b) => (
                  <li key={b.id} className="rounded-full bg-warning-soft px-3 py-1 text-[13px] font-semibold text-warning-ink">
                    {b.name}
                  </li>
                ))}
              </ul>
            )}

            {facts.length > 0 && (
              <dl className="mt-7 grid grid-cols-2 border-t-[1.5px] border-white/70 sm:grid-cols-4">
                {facts.map((f) => (
                  <div key={f.label} className="flex flex-col-reverse gap-1 border-b border-board-rule py-3.5 pr-3">
                    <dt className="flex items-center gap-1.5 text-[13px] text-board-muted">
                      <f.icon className="size-3.5 shrink-0 text-cta" aria-hidden />
                      {f.label}
                    </dt>
                    <dd className="font-display text-2xl font-bold tabular-nums leading-none text-white">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {others.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5 text-sm">
                <span className="text-board-muted">Also works as</span>
                {others.map((o) => (
                  <Link key={o.slug} href={`/providers/${o.slug}`} className="rounded-full border border-white/40 px-3 py-1 font-semibold text-white hover:bg-white/10">
                    {o.profession ?? "Another profession"}
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
