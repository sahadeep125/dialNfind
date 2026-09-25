import { Input } from "@/components/ui/input";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { optionalPincode } from "@/lib/validation";
import { Field, fieldA11y } from "./form";
import { Slider } from "@/components/ui/slider";
import { LocateButton, LocationSearch } from "./editors";
import { MapPicker } from "./map-picker";
import { api } from "@/lib/api";

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

export const locationSchema = z.object({
  addressLine: z.string().trim().max(200, "Keep the address under 200 characters"),
  locality: z.string().trim().max(80, "Keep the locality under 80 characters"),
  city: z.string().trim().min(2, "Enter your city").max(60),
  state: z.string().trim().min(2, "Enter your state").max(60),
  pincode: optionalPincode,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  serviceRadiusKm: z.number().int().min(1).max(100),
});

export type LocationErrors = Partial<Record<keyof LocationValue, string>>;

/** Runs locationSchema and returns messages keyed by field, or null when valid. */
export function validateLocation(value: LocationValue): LocationErrors | null {
  const result = locationSchema.safeParse(value);
  if (result.success) return null;
  const errors: LocationErrors = {};
  for (const issue of result.error.issues) errors[issue.path[0] as keyof LocationValue] ??= issue.message;
  return errors;
}

export function LocationFields({ value, onChange, errors }: { value: LocationValue; onChange: (v: LocationValue) => void; errors?: LocationErrors | null }) {
  const set = (patch: Partial<LocationValue>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <LocationSearch
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
        </div>
        <LocateButton
          onLocate={async (latitude, longitude) => {
            set({ latitude, longitude });
            // Fill in the area from the map when the fields are still empty; the pin is what matters.
            const { location } = await api<{ location: { name: string; city: string; state: string } }>(`/locations/reverse?lat=${latitude}&lng=${longitude}`).catch(() => ({ location: null }));
            if (location?.city) onChange({ ...value, latitude, longitude, city: value.city || location.city, state: value.state || location.state, locality: value.locality || (location.name !== location.city ? location.name : "") });
          }}
        />
      </div>
      <div className="h-64 overflow-hidden rounded-xl border">
        <MapPicker lat={value.latitude} lng={value.longitude} radiusKm={value.serviceRadiusKm} onChange={(latitude, longitude) => set({ latitude, longitude })} />
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        Drag the pin to your exact shop or base location ({value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}).
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="addressLine" label="Street address" error={errors?.addressLine} optional className="sm:col-span-2">
          <Input value={value.addressLine} onChange={(e) => set({ addressLine: e.target.value })} placeholder="Shop number, building, street" autoComplete="street-address" {...fieldA11y("addressLine", errors?.addressLine)} />
        </Field>
        <Field id="locality" label="Locality" error={errors?.locality} optional>
          <Input value={value.locality} onChange={(e) => set({ locality: e.target.value })} placeholder="e.g. Sevoke Road" {...fieldA11y("locality", errors?.locality)} />
        </Field>
        <Field id="city" label="City" error={errors?.city} required>
          <Input value={value.city} onChange={(e) => set({ city: e.target.value })} autoComplete="address-level2" {...fieldA11y("city", errors?.city)} />
        </Field>
        <Field id="state" label="State" error={errors?.state} required>
          <Input value={value.state} onChange={(e) => set({ state: e.target.value })} autoComplete="address-level1" {...fieldA11y("state", errors?.state)} />
        </Field>
        <Field id="pincode" label="PIN code" error={errors?.pincode} optional>
          <Input
            value={value.pincode}
            onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="734001"
            {...fieldA11y("pincode", errors?.pincode)}
          />
        </Field>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>How far will you travel?</Label>
          <span className="text-sm font-semibold text-primary">{value.serviceRadiusKm} km</span>
        </div>
        <Slider min={1} max={50} value={[value.serviceRadiusKm]} onValueChange={([v]) => set({ serviceRadiusKm: v })} />
      </div>
    </div>
  );
}
