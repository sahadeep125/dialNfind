"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useUrlParams } from "./use-url-params";

const RATINGS = [
  { value: "", label: "Any" },
  { value: "3", label: "3.0+" },
  { value: "4", label: "4.0+" },
  { value: "4.5", label: "4.5+" },
];

function FilterFields({ categories, lockedCategory }: { categories?: Category[]; lockedCategory?: Category }) {
  const { params, update } = useUrlParams();
  const [radius, setRadius] = useState(Number(params.get("radius") ?? 15));
  useEffect(() => setRadius(Number(params.get("radius") ?? 15)), [params]);

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
            <Chip active={!params.get("sub")} onClick={() => update({ sub: null })}>
              All
            </Chip>
            {activeCategory.subcategories.map((s) => (
              <Chip key={s.slug} active={params.get("sub") === s.slug} onClick={() => update({ sub: s.slug, q: null })}>
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
                "flex h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border text-sm font-medium transition-colors",
                minRating === r.value ? "border-primary bg-accent text-accent-foreground" : "bg-card hover:bg-muted",
              )}
            >
              {r.value && <Star className="size-3.5 fill-warning text-warning" />}
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
        onClick={() => update({ radius: null, minRating: null, openNow: null, verified: null, sub: null, ...(lockedCategory ? {} : { category: null }) })}
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
        "cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40 hover:text-primary",
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

export function FiltersSidebar(props: { categories?: Category[]; lockedCategory?: Category }) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-5 flex items-center gap-2 text-base font-bold">
          <SlidersHorizontal className="size-4" /> Filters
        </h2>
        <FilterFields {...props} />
      </div>
    </aside>
  );
}

export function FiltersSheet(props: { categories?: Category[]; lockedCategory?: Category; activeCount: number }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden">
          <SlidersHorizontal /> Filters
          {props.activeCount > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">{props.activeCount}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="px-5 pb-8">
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
