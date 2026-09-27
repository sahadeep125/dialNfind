"use client";

import { List, Map as MapIcon, Maximize2, Minimize2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useUrlParams } from "./use-url-params";

const SORT_LABEL: Record<string, string> = { relevance: "Relevance", distance: "Nearest first", rating: "Highest rated", reviews: "Most reviewed" };

export function SortSelect() {
  const { params, update } = useUrlParams();
  const value = params.get("sort") ?? "relevance";
  return (
    <Select value={value} onValueChange={(v) => update({ sort: v === "relevance" ? null : v })}>
      <SelectTrigger className="h-9 w-auto gap-1 border-0 bg-transparent px-1 text-sm shadow-none" aria-label="Sort results">
        <span className="text-muted-foreground">Sort by:</span>
        <SelectValue>{SORT_LABEL[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {Object.entries(SORT_LABEL).map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Switches between the list (with the side map on large screens) and the full-width map. */
export function MapViewButton({ view, variant }: { view: "list" | "map"; variant: "overlay" | "floating" }) {
  const { update } = useUrlParams();
  const toMap = view === "list";
  const Icon = variant === "overlay" ? (toMap ? Maximize2 : Minimize2) : toMap ? MapIcon : List;
  const label = variant === "overlay" ? (toMap ? "View in full screen" : "Exit full screen") : toMap ? "Map" : "List";
  return (
    <button
      type="button"
      onClick={() => update({ view: toMap ? "map" : null }, { resetPage: false })}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 text-sm font-medium transition-colors",
        variant === "overlay"
          ? "rounded-lg bg-card px-3 py-2 text-foreground shadow-md hover:bg-accent"
          : "rounded-full bg-brand-deep px-5 py-3 text-white shadow-[var(--shadow-lift)] hover:bg-brand-deep/90",
      )}
    >
      <Icon className="size-4" /> {label}
    </button>
  );
}
