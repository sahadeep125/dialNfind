"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Layers, Search, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientApi, saveLocationCookie } from "@/lib/client";
import type { LocationOption, Suggestion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LocationPicker } from "./location-picker";
import { buildSearchHref } from "@/lib/search-href";
import { DEFAULT_LOCATION } from "@/lib/default-location";
import { useSavedLocation } from "@/lib/saved-location";

export function SearchBar({
  initialQuery = "",
  initialLocation,
  size = "lg",
  className,
}: {
  initialQuery?: string;
  /** Leave out on cached pages; the saved location is read in the browser. */
  initialLocation?: LocationOption;
  size?: "lg" | "md";
  className?: string;
}) {
  const router = useRouter();
  const saved = useSavedLocation();
  const sourceLocation = initialLocation ?? saved ?? DEFAULT_LOCATION;
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState(sourceLocation);
  const [results, setResults] = useState<{ q: string; items: Suggestion[] }>({ q: "", items: [] });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  // A new search from the page (or the saved location loading) replaces what is in the box.
  const [prevQuery, setPrevQuery] = useState(initialQuery);
  if (prevQuery !== initialQuery) {
    setPrevQuery(initialQuery);
    setQuery(initialQuery);
  }
  const locationKey = `${sourceLocation.latitude},${sourceLocation.longitude},${sourceLocation.label}`;
  const [prevLocationKey, setPrevLocationKey] = useState(locationKey);
  if (prevLocationKey !== locationKey) {
    setPrevLocationKey(locationKey);
    setLocation(sourceLocation);
  }

  // Suggestions only for the text currently typed, and only from two characters.
  const trimmed = query.trim();
  const suggestions = trimmed.length >= 2 && results.q === trimmed ? results.items : [];

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const handle = setTimeout(async () => {
      try {
        const data = await clientApi<{ suggestions: Suggestion[] }>(`/search/suggest?q=${encodeURIComponent(q)}`);
        setResults({ q, items: data.suggestions });
        setActive(-1);
      } catch {
        setResults({ q, items: [] });
      }
    }, 150);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function changeLocation(next: LocationOption) {
    setLocation(next);
    saveLocationCookie(next);
  }

  function go(s?: Suggestion) {
    setOpen(false);
    saveLocationCookie(location);
    if (s?.type === "provider") {
      router.push(`/providers/${s.slug}`);
      return;
    }
    if (s?.type === "service") {
      router.push(buildSearchHref(s.label, location, { sub: s.slug }));
      return;
    }
    if (s?.type === "category") {
      router.push(buildSearchHref("", location, { category: s.slug }));
      return;
    }
    router.push(buildSearchHref(query.trim(), location));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const tall = size === "lg";
  const listOpen = open && suggestions.length > 0;
  const listId = `service-suggestions-${size}`;
  const optionId = (i: number) => `${listId}-${i}`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go(active >= 0 ? suggestions[active] : undefined);
      }}
      className={cn(
        "relative flex w-full flex-col gap-2 rounded-2xl border bg-card p-2 shadow-[var(--shadow-lift)] md:flex-row md:items-stretch md:gap-0",
        className,
      )}
      role="search"
    >
      <div ref={boxRef} className="relative flex min-w-0 flex-1 items-center gap-3 px-3">
        <Search className="size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <label htmlFor="service-search" className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Service
          </label>
          <input
            id="service-search"
            value={query}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={listOpen}
            aria-controls={listId}
            aria-activedescendant={listOpen && active >= 0 ? optionId(active) : undefined}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="What service do you need?"
            className={cn("w-full bg-transparent font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground", tall ? "h-7 text-base" : "h-6 text-sm")}
          />
        </div>
        {listOpen && (
          <div id={listId} role="listbox" aria-label="Suggestions" className="absolute left-0 right-0 top-full z-30 mt-3 overflow-hidden rounded-xl border bg-popover p-1 shadow-[var(--shadow-lift)]">
            {suggestions.map((s, i) => {
              const Icon = s.type === "provider" ? Building2 : s.type === "category" ? Layers : Wrench;
              return (
                <div
                  key={`${s.type}-${s.slug}`}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(s)}
                  className={cn("flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left", i === active ? "bg-accent" : "hover:bg-muted")}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{s.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {s.type === "provider" ? `Business in ${s.context}` : s.type === "category" ? "Category" : `Service in ${s.context}`}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="hidden w-px self-stretch bg-border md:block" />
      <div className={cn("flex items-center px-3 md:w-60", tall ? "h-14" : "h-12")}>
        <LocationPicker value={location} onChange={changeLocation} triggerClassName="w-full" />
      </div>
      <Button type="submit" size={tall ? "lg" : "default"} className={cn("md:ml-1", tall ? "h-14 px-7" : "h-12")}>
        <Search />
        Search
      </Button>
    </form>
  );
}
