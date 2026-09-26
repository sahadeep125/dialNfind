"use client";

import { List, Map as MapIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FiltersSheet } from "./filters";
import { useUrlParams } from "./use-url-params";

export function ResultsToolbar({ categories, lockedCategory, defaultRadius }: { categories?: Category[]; lockedCategory?: Category; defaultRadius: number }) {
  const { params, update } = useUrlParams();
  const view = params.get("view") === "map" ? "map" : "list";
  const activeCount = ["minRating", "openNow", "verified", "radius", "sub", ...(lockedCategory ? [] : ["category"])].filter((k) => params.get(k)).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FiltersSheet categories={categories} lockedCategory={lockedCategory} defaultRadius={defaultRadius} activeCount={activeCount} />
      <Select value={params.get("sort") ?? "relevance"} onValueChange={(v) => update({ sort: v === "relevance" ? null : v })}>
        <SelectTrigger className="w-[11.5rem]" aria-label="Sort results">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="relevance">Sort: Recommended</SelectItem>
          <SelectItem value="distance">Sort: Nearest first</SelectItem>
          <SelectItem value="rating">Sort: Highest rated</SelectItem>
          <SelectItem value="reviews">Sort: Most reviewed</SelectItem>
        </SelectContent>
      </Select>
      <div className="ml-auto inline-flex rounded-xl bg-muted p-1 sm:ml-0" role="group" aria-label="Show results as">
        {(["list", "map"] as const).map((v) => {
          const Icon = v === "list" ? List : MapIcon;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => update({ view: v === "list" ? null : "map" }, { resetPage: false })}
              className={cn(
                "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium capitalize transition-all",
                view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden /> {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}
