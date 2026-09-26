"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LocateFixed, Loader2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { clientApi } from "@/lib/client";
import type { LocationOption } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LocationPicker({
  value,
  onChange,
  className,
  triggerClassName,
}: {
  value: LocationOption;
  onChange: (location: LocationOption) => void;
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await clientApi<{ locations: LocationOption[] }>(`/locations?q=${encodeURIComponent(query)}`);
        setOptions(data.locations);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(handle);
  }, [query, open]);

  function select(location: LocationOption) {
    onChange(location);
    setOpen(false);
    setQuery("");
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Your browser does not support location access");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = Math.round(pos.coords.latitude * 1e6) / 1e6;
        const longitude = Math.round(pos.coords.longitude * 1e6) / 1e6;
        // Name the area ("Sevoke Road, Siliguri") when the API can; the coordinates alone are enough to search.
        const named = await clientApi<{ location: LocationOption }>(`/locations/reverse?lat=${latitude}&lng=${longitude}`).catch(() => null);
        setLocating(false);
        select(named?.location ?? { label: "Current location", name: "Current location", city: "", state: "", kind: "current", latitude, longitude });
      },
      () => {
        setLocating(false);
        toast.error("We could not read your location. Pick an area from the list instead.");
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-full min-w-0 cursor-pointer items-center gap-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
            triggerClassName,
          )}
        >
          <MapPin className="size-5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Location</span>
            <span className="block truncate text-sm font-semibold">{value.label}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("w-[min(22rem,calc(100vw-2rem))] p-0", className)}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search area, locality or city"
            placeholder="Search area, locality or city"
            className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <button
          type="button"
          onClick={useCurrentLocation}
          className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left text-sm font-medium text-primary hover:bg-accent"
        >
          {locating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
          Use my current location
        </button>
        <div className="max-h-72 overflow-y-auto border-t p-1" aria-live="polite" aria-busy={loading}>
          {options.length === 0 && !loading && <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matching areas yet</p>}
          {options.map((o) => (
            <button
              type="button"
              key={`${o.kind}-${o.label}`}
              onClick={() => select(o)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <MapPin className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{o.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {o.kind === "city" ? `${o.state} · city` : o.kind === "place" ? `${[o.city, o.state].filter((v) => v && v !== o.name).join(", ")} · no providers listed yet` : o.city}
                  {o.providerCount ? ` · ${o.providerCount} providers` : ""}
                </span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
