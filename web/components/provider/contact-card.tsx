import { Globe, Mail } from "lucide-react";
import type { ProviderDetail } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ContactButtons } from "./contact-buttons";
import { OpenStatus } from "./provider-card";
import { ProfileFavoriteButton } from "./viewer-state";

const PRICE_UNIT_LABEL: Record<string, string> = { per_visit: "per visit", per_hour: "per hour", fixed: "fixed price" };

const SECONDARY =
  "flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-input bg-card text-sm font-medium text-foreground transition-colors hover:border-foreground/25 hover:bg-muted";

/** The sidebar's first card: starting price and the ways to get in touch. On small screens Call and WhatsApp live in the bottom bar instead. */
export function ContactCard({ p }: { p: ProviderDetail }) {
  const price = formatPrice(p.startingPrice);
  return (
    <div className="rounded-lg border bg-card p-5 shadow-[var(--shadow-lift)]">
      <div className="flex items-start justify-between gap-3">
        {price ? (
          <div>
            <div className="text-xs text-muted-foreground">Starting from</div>
            <div className="text-2xl font-extrabold leading-tight">
              {price}
              {p.priceUnit && <span className="ml-1.5 text-sm font-normal text-muted-foreground">{PRICE_UNIT_LABEL[p.priceUnit]}</span>}
            </div>
          </div>
        ) : (
          <div className="text-base font-semibold">Price on request</div>
        )}
        {p.isAvailable && <OpenStatus provider={p} className="mt-1 [&>span:last-child]:hidden" />}
      </div>

      <ContactButtons provider={p} source="profile" categorySlug={p.primaryCategory?.slug} size="lg" layout="stack" variant="profile" className="mt-5 hidden lg:flex" />
      <p className="mt-3 hidden text-center text-xs text-muted-foreground lg:block">Mention DialNFind when you call. No booking fees.</p>

      <div className={cn("flex gap-2", "mt-5 border-t pt-4")}>
        {p.email && (
          <a href={`mailto:${p.email}`} className={SECONDARY}>
            <Mail className="size-4" aria-hidden /> Email
          </a>
        )}
        {p.website && (
          <a href={p.website} target="_blank" rel="noopener noreferrer" className={SECONDARY}>
            <Globe className="size-4" aria-hidden /> Website
          </a>
        )}
        <ProfileFavoriteButton providerId={p.id} className={cn(SECONDARY, "rounded-md")} />
      </div>
    </div>
  );
}
