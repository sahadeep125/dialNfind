"use client";

import { useState } from "react";
import { SlidersHorizontal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSubcategory, useUrlParams } from "./use-url-params";

const RATINGS = [
  { value: "", label: "Any" },
  { value: "3", label: "3.0+" },
  { value: "4", label: "4.0+" },
  { value: "4.5", label: "4.5+" },
];

type FilterProps = { categories?: Category[]; lockedCategory?: Category; lockedSub?: string; defaultRadius: number };

function FilterFields({ categories, lockedCategory, lockedSub, defaultRadius }: FilterProps) {
  const { params, update } = useUrlParams();
  const { selected: subSlug, select: selectSub } = useSubcategory(lockedCategory, lockedSub);
  // The slider moves freely while dragged and follows the URL when that changes (back button, reset).
  const urlRadius = Number(params.get("radius") ?? defaultRadius);
  const [radius, setRadius] = useState(urlRadius);
  const [prevUrlRadius, setPrevUrlRadius] = useState(urlRadius);
  if (prevUrlRadius !== urlRadius) {
    setPrevUrlRadius(urlRadius);
    setRadius(urlRadius);
  }

  const categorySlug = lockedCategory?.slug ?? params.get("category") ?? "";
  const activeCategory = lockedCategory ?? categories?.find((c) => c.slug === categorySlug);
  const minRating = params.get("minRating") ?? "";

  return (
    <div className="space-y-7">
      {categories && !lockedCategory && (
        <div className="space-y-2.5">
          <Label>Category</Label>
          <Select value={categorySlug || "all"} onValueChange={(v) => update({ category: v === "all" ? null : v, sub: null })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {activeCategory && activeCategory.subcategories.length > 0 && (
        <div className="space-y-2.5">
          <Label>Service</Label>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={!subSlug} onClick={() => selectSub(null)}>
              All
            </Chip>
            {activeCategory.subcategories.map((s) => (
              <Chip key={s.slug} active={subSlug === s.slug} onClick={() => selectSub(s.slug)}>
                {s.name}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Distance</Label>
          <span className="text-sm font-semibold text-primary">Within {radius} km</span>
        </div>
        <Slider min={1} max={50} step={1} value={[radius]} onValueChange={([v]) => setRadius(v)} onValueCommit={([v]) => update({ radius: String(v) })} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 km</span>
          <span>50 km</span>
        </div>
      </div>

      <div className="space-y-2.5">
        <Label>Minimum rating</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {RATINGS.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => update({ minRating: r.value || null })}
              className={cn(
                "flex h-9 cursor-pointer items-center justify-center gap-1 rounded-md border text-sm font-medium transition-colors",
                minRating === r.value ? "border-primary bg-accent text-accent-foreground" : "border-input bg-card hover:bg-muted",
              )}
            >
              {r.value && <Star className="size-3.5 fill-star text-star" />}
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <ToggleRow id="open-now" label="Open now" description="Only providers open at this moment" checked={params.get("openNow") === "true"} onChange={(v) => update({ openNow: v ? "true" : null })} />
        <ToggleRow id="verified" label="Verified only" description="Phone and business verified" checked={params.get("verified") === "true"} onChange={(v) => update({ verified: v ? "true" : null })} />
      </div>

      <Button
        variant="ghost"
        className="w-full"
        onClick={() => update({ radius: null, minRating: null, openNow: null, verified: null, ...(lockedCategory ? {} : { sub: null, category: null }) })}
      >
        Reset filters
      </Button>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-md border px-3 py-1 text-sm transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card hover:border-foreground/25",
      )}
    >
      {children}
    </button>
  );
}

function ToggleRow({ id, label, description, checked, onChange }: { id: string; label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function FiltersSheet(props: FilterProps & { activeCount: number }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-9 shrink-0 px-3 text-sm font-semibold">
          <SlidersHorizontal /> All filters
          {props.activeCount > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-cta text-[11px] text-cta-foreground">{props.activeCount}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full px-5 pb-8 sm:max-w-md">
        <SheetHeader className="px-0">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto">
          <FilterFields {...props} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
