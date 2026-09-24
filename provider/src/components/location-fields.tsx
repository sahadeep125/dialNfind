import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { LocateButton, LocationSearch } from "./editors";
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

export function LocationFields({ value, onChange }: { value: LocationValue; onChange: (v: LocationValue) => void }) {
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
                locality: l.kind === "area" ? l.name : value.locality,
              })
            }
          />
        </div>
        <LocateButton onLocate={(latitude, longitude) => set({ latitude, longitude })} />
      </div>
      <div className="h-64 overflow-hidden rounded-xl border">
        <MapPicker lat={value.latitude} lng={value.longitude} radiusKm={value.serviceRadiusKm} onChange={(latitude, longitude) => set({ latitude, longitude })} />
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        Drag the pin to your exact shop or base location ({value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}).
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="addressLine">Street address</Label>
          <Input id="addressLine" value={value.addressLine} onChange={(e) => set({ addressLine: e.target.value })} placeholder="Shop number, building, street" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="locality">Locality</Label>
          <Input id="locality" value={value.locality} onChange={(e) => set({ locality: e.target.value })} placeholder="e.g. Sevoke Road" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" value={value.city} onChange={(e) => set({ city: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" value={value.state} onChange={(e) => set({ state: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pincode">Pincode</Label>
          <Input id="pincode" value={value.pincode} onChange={(e) => set({ pincode: e.target.value })} />
        </div>
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
