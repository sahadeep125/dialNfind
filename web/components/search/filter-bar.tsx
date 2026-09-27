"use client";

import { useState } from "react";
import { BadgeCheck, Check, ChevronDown, Star } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FiltersSheet } from "./filters";
import { useSubcategory, useUrlParams } from "./use-url-params";

const RATINGS = [
  { value: "", label: "Any rating" },
  { value: "3", label: "3.0+" },
  { value: "4", label: "4.0+" },
  { value: "4.5", label: "4.5+" },
];

const PILL = "inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border bg-card px-3.5 text-sm font-medium text-foreground/85 transition-colors hover:bg-muted";
const PILL_ON = "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10";

/** One row of quick filters under the search banner; every change is written to the URL. */
export function FilterBar({ categories, lockedCategory, lockedSub, defaultRadius }: { categories?: Category[]; lockedCategory?: Category; lockedSub?: string; defaultRadius: number }) {
  const { params, update } = useUrlParams();
  const { selected: subSlug, select: selectSub } = useSubcategory(lockedCategory, lockedSub);
  // On a category page the subcategory is the page itself, not a filter.
  const activeCount = ["minRating", "openNow", "verified", "radius", ...(lockedCategory ? [] : ["sub", "category"])].filter((k) => params.get(k)).length;
  const radius = Number(params.get("radius") ?? defaultRadius);
  const minRating = params.get("minRating") ?? "";
  const openNow = params.get("openNow") === "true";
  const verified = params.get("verified") === "true";
  const categorySlug = lockedCategory?.slug ?? params.get("category") ?? "";
  const activeCategory = lockedCategory ?? categories?.find((c) => c.slug === categorySlug);
  const activeSub = activeCategory?.subcategories.find((s) => s.slug === subSlug);

  return (
    <div className="border-b bg-card">
      <div className="container-wide flex items-center gap-2.5 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FiltersSheet categories={categories} lockedCategory={lockedCategory} lockedSub={lockedSub} defaultRadius={defaultRadius} activeCount={activeCount} />

        <RadiusPill radius={radius} active={params.has("radius")} onCommit={(v) => update({ radius: String(v) })} />

        <button type="button" aria-pressed={openNow} onClick={() => update({ openNow: openNow ? null : "true" })} className={cn(PILL, openNow && "border-success/50 bg-success-soft text-[oklch(0.42_0.1_165)] hover:bg-success-soft")}>
          <span className={cn("size-2 rounded-full", openNow ? "bg-success" : "bg-muted-foreground/40")} /> Open now
        </button>

        <Popover>
          <PopoverTrigger className={cn(PILL, minRating && PILL_ON)}>
            <Star className="size-4 text-warning" fill="currentColor" strokeWidth={0} />
            {minRating ? `Rating ${minRating}+` : "Rating"}
            <ChevronDown className="size-4 opacity-60" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48 p-1">
            {RATINGS.map((r) => (
              <OptionRow key={r.label} selected={minRating === r.value} onClick={() => update({ minRating: r.value || null })}>
                {r.label}
              </OptionRow>
            ))}
          </PopoverContent>
        </Popover>

        <button type="button" aria-pressed={verified} onClick={() => update({ verified: verified ? null : "true" })} className={cn(PILL, verified && PILL_ON)}>
          <BadgeCheck className={cn("size-4", verified ? "text-primary" : "text-[oklch(0.6_0.13_165)]")} /> Verified only
        </button>

        {categories && !lockedCategory && (
          <Popover>
            <PopoverTrigger className={cn(PILL, categorySlug && PILL_ON)}>
              {activeCategory?.name ?? "Category"}
              <ChevronDown className="size-4 opacity-60" />
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-80 w-60 overflow-y-auto p-1">
              <OptionRow selected={!categorySlug} onClick={() => update({ category: null, sub: null })}>
                All categories
              </OptionRow>
              {categories.map((c) => (
                <OptionRow key={c.slug} selected={c.slug === categorySlug} onClick={() => update({ category: c.slug, sub: null })}>
                  {c.name}
                </OptionRow>
              ))}
            </PopoverContent>
          </Popover>
        )}

        {activeCategory && activeCategory.subcategories.length > 0 && (
          <Popover>
            <PopoverTrigger className={cn(PILL, activeSub && PILL_ON)}>
              {activeSub?.name ?? "Service"}
              <ChevronDown className="size-4 opacity-60" />
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-80 w-60 overflow-y-auto p-1">
              <OptionRow selected={!activeSub} onClick={() => selectSub(null)}>
                All services
              </OptionRow>
              {activeCategory.subcategories.map((s) => (
                <OptionRow key={s.slug} selected={s.slug === subSlug} onClick={() => selectSub(s.slug)}>
                  {s.name}
                </OptionRow>
              ))}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

function RadiusPill({ radius, active, onCommit }: { radius: number; active: boolean; onCommit: (v: number) => void }) {
  // The slider moves freely while dragged and follows the URL when that changes.
  const [value, setValue] = useState(radius);
  const [prev, setPrev] = useState(radius);
  if (prev !== radius) {
    setPrev(radius);
    setValue(radius);
  }
  return (
    <Popover>
      <PopoverTrigger className={cn(PILL, active && PILL_ON)}>
        Within {radius} km
        <ChevronDown className="size-4 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Distance</span>
          <span className="font-semibold text-primary">Within {value} km</span>
        </div>
        <Slider className="mt-4" min={1} max={50} step={1} value={[value]} onValueChange={([v]) => setValue(v)} onValueCommit={([v]) => onCommit(v)} />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>1 km</span>
          <span>50 km</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function OptionRow({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted", selected && "font-semibold text-primary")}
    >
      {children}
      {selected && <Check className="size-4" />}
    </button>
  );
}
