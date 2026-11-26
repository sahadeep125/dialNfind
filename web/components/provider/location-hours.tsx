import { ExternalLink, MapPin, Navigation } from "lucide-react";
import type { ProviderDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DistanceFromYou } from "./distance-from-you";
import { ExpandableChips } from "./expandable";
import { LocationMap } from "./location-map";
import { OpenStatus } from "./provider-card";
import { fullAddress } from "./profile-header";
import { SECONDARY_ACTION, directionsHref } from "./contact-card";

/** Where they are and when they work: map, address, directions, distance, service areas and the week's hours. */
export function LocationAndHours({ p }: { p: ProviderDetail }) {
  const hasHours = !p.is24x7 && p.hours.some((h) => h.openTime);
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`;
  return (
    <div className={cn("grid gap-6", hasHours && "md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]")}>
      <div>
        <div className="relative h-56 overflow-hidden rounded-lg border md:h-64">
          <LocationMap lat={p.latitude} lng={p.longitude} radiusKm={p.serviceRadiusKm} label={p.businessName} />
        </div>
        <p className="mt-4 flex items-start gap-2.5 text-[15px]">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>{fullAddress(p)}</span>
        </p>
        <DistanceFromYou lat={p.latitude} lng={p.longitude} className="mt-2 text-[15px]" />
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={directionsHref(p)} target="_blank" rel="noopener noreferrer" className={cn(SECONDARY_ACTION, "flex-none")}>
            <Navigation className="size-4" aria-hidden /> Get directions
          </a>
          <a href={mapsHref} target="_blank" rel="noopener noreferrer" className={cn(SECONDARY_ACTION, "flex-none")}>
            <ExternalLink className="size-4" aria-hidden /> Open in Google Maps
          </a>
        </div>
        <div className="mt-5">
          <ExpandableChips
            header={<span className="text-sm text-muted-foreground">Works within {p.serviceRadiusKm} km of this address</span>}
            chips={p.serviceAreas.map((a) => a.areaName)}
            initial={6}
            noun="areas"
            linkLabel="View service areas"
          />
        </div>
      </div>

      {hasHours && (
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold">Working hours</h3>
            {p.isAvailable && <OpenStatus provider={{ ...p, hasHours: true }} compact className="text-sm" />}
          </div>
          <table className="mt-3 w-full text-[15px]">
            <tbody>
              {p.hours.map((h) => (
                <tr key={h.dayOfWeek} className={cn(h.isToday && "bg-accent font-semibold")}>
                  <td className="rounded-l-md py-2 pl-3 pr-2">
                    {h.day}
                    {h.isToday && <span className="sr-only"> (today)</span>}
                  </td>
                  <td className={cn("rounded-r-md py-2 pr-3 text-right tabular-nums", h.label === "Closed" && "text-muted-foreground")}>{h.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
