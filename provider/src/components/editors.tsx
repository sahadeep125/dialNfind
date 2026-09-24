import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, LocateFixed, MapPin, Plus, Search, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { DAYS, PRICE_UNITS } from "@/lib/format";
import type { Category, Hours, LocationOption, PriceUnit, ProviderService, ServiceArea } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: () => api<{ categories: Category[] }>("/categories").then((r) => r.categories), staleTime: Infinity });
}

// Hours --------------------------------------------------------------------------------------

export const DEFAULT_HOURS: Hours[] = DAYS.map((_, d) => ({ dayOfWeek: d, openTime: d === 0 ? null : "09:00", closeTime: d === 0 ? null : "20:00", is24x7: false }));

export function normalizeHours(hours: Hours[]): Hours[] {
  return DAYS.map((_, d) => hours.find((h) => h.dayOfWeek === d) ?? { dayOfWeek: d, openTime: null, closeTime: null, is24x7: false });
}

/** Per-day problems keyed by dayOfWeek, or null when every open day has a valid range. */
export function validateHours(value: Hours[]): Record<number, string> | null {
  const errors: Record<number, string> = {};
  for (const h of value) {
    if (h.is24x7) continue;
    if (!h.openTime !== !h.closeTime) errors[h.dayOfWeek] = "Set both opening and closing times";
    else if (h.openTime && h.closeTime && h.closeTime <= h.openTime) errors[h.dayOfWeek] = "Closing time must be after opening time";
  }
  return Object.keys(errors).length ? errors : null;
}

export function HoursEditor({ value, onChange }: { value: Hours[]; onChange: (h: Hours[]) => void }) {
  const hours = normalizeHours(value);
  const errors = validateHours(hours) ?? {};
  const allDay = hours.some((h) => h.is24x7);
  const set = (d: number, patch: Partial<Hours>) => onChange(hours.map((h) => (h.dayOfWeek === d ? { ...h, ...patch } : h)));
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between gap-4 rounded-xl border p-4">
        <div>
          <div className="font-medium">Open 24 hours, 7 days</div>
          <div className="text-sm text-muted-foreground">For emergency services that take calls any time.</div>
        </div>
        <Switch checked={allDay} onCheckedChange={(v) => onChange(hours.map((h) => ({ ...h, is24x7: v, openTime: v ? null : "09:00", closeTime: v ? null : "20:00" })))} />
      </label>
      {!allDay && (
        <div className="divide-y rounded-xl border">
          {order.map((d) => {
            const h = hours[d];
            const open = !!h.openTime || !!h.closeTime;
            return (
              <div key={d} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex w-36 items-center gap-3">
                  <Switch checked={open} onCheckedChange={(v) => set(d, v ? { openTime: "09:00", closeTime: "20:00" } : { openTime: null, closeTime: null })} />
                  <span className="text-sm font-medium">{DAYS[d]}</span>
                </div>
                {open ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      aria-label={`${DAYS[d]} opening time`}
                      aria-invalid={!!errors[d] || undefined}
                      aria-describedby={errors[d] ? `hours-${d}-error` : undefined}
                      value={h.openTime ?? ""}
                      onChange={(e) => set(d, { openTime: e.target.value || null })}
                      className="h-9 w-32"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="time"
                      aria-label={`${DAYS[d]} closing time`}
                      aria-invalid={!!errors[d] || undefined}
                      aria-describedby={errors[d] ? `hours-${d}-error` : undefined}
                      value={h.closeTime ?? ""}
                      onChange={(e) => set(d, { closeTime: e.target.value || null })}
                      className="h-9 w-32"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
                {d === 1 && open && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => onChange(hours.map((x) => (x.dayOfWeek >= 2 && x.dayOfWeek <= 6 ? { ...x, openTime: h.openTime, closeTime: h.closeTime } : x)))}
                  >
                    <Copy /> Copy to Tue to Sat
                  </Button>
                )}
                {errors[d] && (
                  <p id={`hours-${d}-error`} role="alert" className="w-full text-xs font-medium text-destructive sm:pl-39">
                    {errors[d]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Services -----------------------------------------------------------------------------------

export const MAX_PRICE = 1_000_000;

function priceError(p: number | null | undefined): string | null {
  if (p == null) return null;
  if (!Number.isFinite(p) || p < 0) return "Enter a price of 0 or more";
  if (!Number.isInteger(p)) return "Use whole rupees";
  if (p > MAX_PRICE) return "Keep the price under Rs 10,00,000";
  return null;
}

/** First problem with the service list, or null. */
export function validateServices(value: ProviderService[]): string | null {
  if (value.length === 0) return "Pick at least one service";
  for (const s of value) if (priceError(s.startingPrice)) return "Fix the highlighted starting prices";
  return null;
}

export function ServicesEditor({ value, onChange }: { value: ProviderService[]; onChange: (s: ProviderService[]) => void }) {
  const { data: categories = [] } = useCategories();
  const [categoryId, setCategoryId] = useState<number | null>(value[0]?.categoryId ?? null);
  useEffect(() => {
    if (!categoryId && value[0]) setCategoryId(value[0].categoryId);
  }, [value, categoryId]);
  const category = categories.find((c) => c.id === categoryId);
  const selected = (subId: number) => value.find((s) => s.subcategoryId === subId);

  function toggle(catId: number, subId: number) {
    if (selected(subId)) onChange(value.filter((s) => s.subcategoryId !== subId));
    else onChange([...value, { categoryId: catId, subcategoryId: subId, startingPrice: null, priceUnit: "per_visit", isPrimary: value.length === 0 }]);
  }
  const update = (subId: number | null, patch: Partial<ProviderService>) => onChange(value.map((s) => (s.subcategoryId === subId ? { ...s, ...patch } : s)));
  const makePrimary = (subId: number | null) => onChange(value.map((s) => ({ ...s, isPrimary: s.subcategoryId === subId })));
  const nameOf = (s: ProviderService) => {
    const cat = categories.find((c) => c.id === s.categoryId);
    return cat?.subcategories.find((x) => x.id === s.subcategoryId)?.name ?? s.subcategory?.name ?? cat?.name ?? "Service";
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Category</Label>
        <p className="text-xs text-muted-foreground">Categories are managed by DialNFind so customers can find you. Pick the ones that match your work.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {categories.map((c) => {
            const count = value.filter((s) => s.categoryId === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  categoryId === c.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40",
                )}
              >
                {c.name}
                {count > 0 && <span className="ml-1.5 rounded-full bg-white/25 px-1.5 text-xs">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {category && (
        <div className="space-y-2">
          <Label>Services you offer in {category.name}</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {category.subcategories.map((s) => (
              <label key={s.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors", selected(s.id) && "border-primary bg-accent")}>
                <Checkbox checked={!!selected(s.id)} onCheckedChange={() => toggle(category.id, s.id)} />
                <span className="text-sm font-medium">{s.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {value.length > 0 && (
        <div className="space-y-2">
          <Label>Starting prices</Label>
          <div className="divide-y rounded-xl border">
            {value.map((s) => {
              const rowId = `price-${s.categoryId}-${s.subcategoryId ?? "all"}`;
              const err = priceError(s.startingPrice);
              return (
              <div key={`${s.categoryId}-${s.subcategoryId}`} className="flex flex-wrap items-center gap-3 p-3">
                <button type="button" onClick={() => makePrimary(s.subcategoryId)} title="Set as main service" className="cursor-pointer">
                  <Star className={cn("size-4", s.isPrimary ? "fill-warning text-warning" : "text-muted-foreground")} />
                </button>
                <span className="min-w-40 flex-1 text-sm font-medium">
                  {nameOf(s)} {s.isPrimary && <span className="ml-1 text-xs text-primary">Main service</span>}
                </span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rs</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={MAX_PRICE}
                    step={1}
                    aria-label={`Starting price for ${nameOf(s)}`}
                    aria-invalid={!!err || undefined}
                    aria-describedby={err ? rowId : undefined}
                    value={s.startingPrice ?? ""}
                    onChange={(e) => update(s.subcategoryId, { startingPrice: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="Price"
                    className="h-9 w-28 pl-9"
                  />
                </div>
                <Select value={s.priceUnit} onValueChange={(v) => update(s.subcategoryId, { priceUnit: v as PriceUnit })}>
                  <SelectTrigger size="sm" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(value.filter((x) => x !== s))} aria-label={`Remove ${nameOf(s)}`}>
                  <Trash2 />
                </Button>
                {err && (
                  <p id={rowId} role="alert" className="w-full text-xs font-medium text-destructive">
                    {err}
                  </p>
                )}
              </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">The star marks your main service. It decides which category you appear under first.</p>
        </div>
      )}
    </div>
  );
}

// Location -----------------------------------------------------------------------------------

export function LocationSearch({ onPick, placeholder = "Search your locality or city" }: { onPick: (l: LocationOption) => void; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ["locations", q],
    queryFn: () => api<{ locations: LocationOption[] }>(`/locations?q=${encodeURIComponent(q)}`).then((r) => r.locations),
    enabled: open,
  });
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder={placeholder} className="pl-9" />
      {open && data.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border bg-popover p-1 shadow-[var(--shadow-lift)]">
          {data.map((l) => (
            <button
              key={`${l.kind}-${l.label}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(l);
                setQ("");
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <MapPin className="size-4 text-muted-foreground" /> {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function useCurrentPosition() {
  return (cb: (lat: number, lng: number) => void) => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported in this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => cb(Math.round(p.coords.latitude * 1e6) / 1e6, Math.round(p.coords.longitude * 1e6) / 1e6),
      () => toast.error("Could not read your location"),
    );
  };
}

export function LocateButton({ onLocate }: { onLocate: (lat: number, lng: number) => void }) {
  const locate = useCurrentPosition();
  return (
    <Button type="button" variant="outline" onClick={() => locate(onLocate)}>
      <LocateFixed /> Use my current location
    </Button>
  );
}

// Service areas -----------------------------------------------------------------------------

export const MAX_AREAS = 50;

export function AreasEditor({ value, onChange }: { value: ServiceArea[]; onChange: (a: ServiceArea[]) => void }) {
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const add = (area: ServiceArea): boolean => {
    const name = area.areaName.trim();
    if (name.length < 2) return setError("Enter at least 2 characters"), false;
    if (name.length > 80) return setError("Keep the area name under 80 characters"), false;
    if (value.some((a) => a.areaName.toLowerCase() === name.toLowerCase())) return setError(`${name} is already in your list`), false;
    if (value.length >= MAX_AREAS) return setError(`You can list up to ${MAX_AREAS} areas`), false;
    setError(null);
    onChange([...value, { ...area, areaName: name }]);
    return true;
  };
  const addCustom = () => {
    if (add({ areaName: custom })) setCustom("");
  };
  return (
    <div className="space-y-4">
      <LocationSearch placeholder="Add a locality you serve" onPick={(l) => add({ areaName: l.name, latitude: l.latitude, longitude: l.longitude })} />
      <div>
        <div className="flex gap-2">
          <Input
            value={custom}
            maxLength={80}
            aria-label="Area name"
            aria-invalid={!!error || undefined}
            aria-describedby={error ? "area-error" : undefined}
            onChange={(e) => {
              setCustom(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Or type an area name"
          />
          <Button type="button" variant="outline" onClick={addCustom}>
            <Plus /> Add
          </Button>
        </div>
        {error && (
          <p id="area-error" role="alert" className="mt-1.5 text-xs font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
      {value.length ? (
        <div className="flex flex-wrap gap-2">
          {value.map((a) => (
            <span key={a.areaName} className="inline-flex items-center gap-1.5 rounded-full bg-accent py-1 pl-3 pr-1.5 text-sm font-medium text-accent-foreground">
              {a.areaName}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== a))} className="cursor-pointer rounded-full p-0.5 hover:bg-white" aria-label={`Remove ${a.areaName}`}>
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No areas yet. Customers searching these localities will see you.</p>
      )}
    </div>
  );
}
