import type { ProviderDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { OpenStatus } from "./provider-card";
import { SideCard } from "./section-card";

export function OpeningHours({ p }: { p: ProviderDetail }) {
  return (
    <SideCard title="Opening hours" action={p.isAvailable ? <OpenStatus provider={p} className="[&>span:last-child]:hidden" /> : undefined}>
      {/* Imported listings often have no hours yet; seven "Closed" rows would tell visitors the business is shut. */}
      {!p.is24x7 && p.hours.every((h) => !h.openTime) ? (
        <p className="text-sm text-muted-foreground">Hours not added yet. Call to check when they are open.</p>
      ) : (
      <table className="w-full text-sm">
        <tbody>
          {p.hours.map((h) => (
            <tr key={h.dayOfWeek} className={cn(h.isToday && "bg-accent font-semibold")}>
              <td className="rounded-l-md py-1.5 pl-2 pr-2">
                {h.day}
                {h.isToday && <span className="sr-only"> (today)</span>}
              </td>
              <td className={cn("rounded-r-md py-1.5 pr-2 text-right", h.label === "Closed" && "text-muted-foreground")}>{h.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
      {p.is24x7 && <p className="mt-3 text-xs font-medium text-cta-strong">Available 24x7 for emergencies</p>}
    </SideCard>
  );
}
