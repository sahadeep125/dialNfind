import { Check, Globe, Mail, MapPin, Navigation } from "lucide-react";
import type { ProviderDetail } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ContactButtons } from "./contact-buttons";
import { OpenStatus } from "./provider-card";
import { fullAddress } from "./profile-header";
import { ProfileFavoriteButton } from "./viewer-state";

const PRICE_UNIT_LABEL: Record<string, string> = { per_visit: "per visit", per_hour: "per hour", fixed: "fixed price" };

const VERIFICATION_LABEL: Record<string, string> = { phone: "Phone number", business: "Business documents", location: "Location", id_proof: "ID proof" };

export const SECONDARY_ACTION =
  "flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-input bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:border-foreground/25 hover:bg-muted";

export const directionsHref = (p: Pick<ProviderDetail, "latitude" | "longitude">) =>
  `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;

/**
 * The desktop sidebar: everything needed to get in touch, and only that. Phones get the same actions from
 * the bottom call bar and the row under the profile header.
 */
export function ContactCard({ p }: { p: ProviderDetail }) {
  const price = formatPrice(p.startingPrice);
  const hasHours = p.is24x7 || p.hours.some((h) => h.openTime);
  const verified = Array.from(new Set(p.verifications.map((v) => v.type))).filter((t) => t in VERIFICATION_LABEL);
  return (
    <div className="rounded-lg border bg-card p-5 shadow-[var(--shadow-lift)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Contact</p>
          <p className="truncate font-display text-lg font-bold leading-snug">{p.businessName}</p>
        </div>
        {hasHours && <OpenStatus provider={{ ...p, hasHours: true }} compact className="mt-1 shrink-0 text-sm" />}
      </div>

      {price && (
        <p className="mt-3 text-sm">
          <span className="text-muted-foreground">Starting from </span>
          <span className="font-bold tabular-nums">{price}</span>
          {p.priceUnit && <span className="text-muted-foreground"> {PRICE_UNIT_LABEL[p.priceUnit]}</span>}
        </p>
      )}

      <ContactButtons provider={p} source="profile" categorySlug={p.primaryCategory?.slug} size="lg" layout="stack" variant="profile" className="mt-4" />

      <a href={directionsHref(p)} target="_blank" rel="noopener noreferrer" className={cn(SECONDARY_ACTION, "mt-2 h-12 w-full text-[15px]")}>
        <Navigation className="size-4" aria-hidden /> Get directions
      </a>

      <p className="mt-4 flex items-start gap-2 text-sm text-foreground/80">
        <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span>{fullAddress(p)}</span>
      </p>

      <div className="mt-4 flex gap-2 border-t pt-4">
        {p.email && (
          <a href={`mailto:${p.email}`} className={SECONDARY_ACTION}>
            <Mail className="size-4" aria-hidden /> Email
          </a>
        )}
        {p.website && (
          <a href={p.website} target="_blank" rel="noopener noreferrer" className={SECONDARY_ACTION}>
            <Globe className="size-4" aria-hidden /> Website
          </a>
        )}
        <ProfileFavoriteButton providerId={p.id} className={cn(SECONDARY_ACTION, "rounded-md")} />
      </div>

      {verified.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t pt-4 text-sm" aria-label="Checked by KaajVa">
          {verified.map((type) => (
            <li key={type} className="flex items-center gap-2">
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-success text-white">
                <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
              </span>
              {VERIFICATION_LABEL[type]} verified
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground">Mention KaajVa when you call. No booking fees.</p>
    </div>
  );
}
