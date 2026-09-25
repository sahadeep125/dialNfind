import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Field, fieldA11y } from "@/components/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { MapPicker } from "./map-picker";

export interface LocationValue {
  addressLine: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
}

export type LocationErrors = Partial<Record<keyof LocationValue, string>>;

interface LocationOption {
  label: string;
  name: string;
  city: string;
  state: string;
  kind: "city" | "area" | "place";
  latitude: number;
  longitude: number;
}

/** Checks the fields the API requires; returns messages keyed by field, or null when valid. */
export function locationProblems(v: LocationValue): LocationErrors | null {
  const errors: LocationErrors = {};
  if (v.city.trim().length < 2) errors.city = "Enter the city";
  if (v.state.trim().length < 2) errors.state = "Enter the state";
  if (v.pincode && !/^[1-9]\d{5}$/.test(v.pincode)) errors.pincode = "Use a 6-digit PIN code";
  return Object.keys(errors).length ? errors : null;
}

/** Search a place (directory areas first, then the map), fine-tune the pin, and fill in the address. */
function PlaceSearch({ onPick }: { onPick: (l: LocationOption) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ["locations", q],
    queryFn: () => api<{ locations: LocationOption[] }>(`/locations?q=${encodeURIComponent(q)}`).then((r) => r.locations),
    enabled: open && q.trim().length >= 2,
  });
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search a locality, town or address"
        aria-label="Search a place"
        className="pl-9"
      />
      {open && data.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-[1000] mt-1 max-h-64 overflow-y-auto rounded-xl border bg-popover p-1 shadow-[var(--shadow-lift)]">
          {data.map((l) => (
            <button
              key={`${l.kind}-${l.label}-${l.latitude}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(l);
                setQ("");
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <MapPin className="size-4 shrink-0 text-muted-foreground" /> <span className="flex-1 truncate">{l.label}</span>
              {l.kind === "place" && <span className="text-[11px] text-muted-foreground">Map</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function LocationEditor({ value, onChange, errors, idPrefix = "loc" }: { value: LocationValue; onChange: (v: LocationValue) => void; errors?: LocationErrors | null; idPrefix?: string }) {
  const set = (patch: Partial<LocationValue>) => onChange({ ...value, ...patch });
  const id = (k: string) => `${idPrefix}-${k}`;
  return (
    <div className="space-y-4">
      <PlaceSearch
        onPick={(l) =>
          set({
            latitude: l.latitude,
            longitude: l.longitude,
            city: l.city || l.name,
            state: l.state || value.state,
            locality: l.kind === "city" ? value.locality : l.name,
          })
        }
      />
      <div className="h-60 overflow-hidden rounded-xl border">
        <MapPicker lat={value.latitude} lng={value.longitude} radiusKm={value.serviceRadiusKm} onChange={(latitude, longitude) => set({ latitude, longitude })} />
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Drag the pin or click the map to place the business exactly ({value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}).
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={id("address")} label="Street address" optional className="sm:col-span-2">
          <Input value={value.addressLine} maxLength={200} onChange={(e) => set({ addressLine: e.target.value })} {...fieldA11y(id("address"))} />
        </Field>
        <Field id={id("locality")} label="Locality" optional>
          <Input value={value.locality} maxLength={80} onChange={(e) => set({ locality: e.target.value })} {...fieldA11y(id("locality"))} />
        </Field>
        <Field id={id("city")} label="City" required error={errors?.city}>
          <Input value={value.city} maxLength={60} onChange={(e) => set({ city: e.target.value })} {...fieldA11y(id("city"), errors?.city)} />
        </Field>
        <Field id={id("state")} label="State" required error={errors?.state}>
          <Input value={value.state} maxLength={60} onChange={(e) => set({ state: e.target.value })} {...fieldA11y(id("state"), errors?.state)} />
        </Field>
        <Field id={id("pincode")} label="PIN code" optional error={errors?.pincode}>
          <Input value={value.pincode} inputMode="numeric" onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} {...fieldA11y(id("pincode"), errors?.pincode)} />
        </Field>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Travels up to</Label>
          <span className="text-sm font-semibold text-primary">{value.serviceRadiusKm} km</span>
        </div>
        <Slider min={1} max={50} value={[value.serviceRadiusKm]} onValueChange={([v]) => set({ serviceRadiusKm: v })} aria-label="Service radius in km" />
      </div>
    </div>
  );
}
