"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Category } from "@/lib/types";
import { serviceHref } from "@/lib/service-href";

/** Updates query params in place (or on another path); any filter change resets pagination. */
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = useCallback(
    (changes: Record<string, string | null | undefined>, opts: { resetPage?: boolean; pathname?: string } = { resetPage: true }) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(changes)) {
        if (v === null || v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (opts.resetPage !== false) next.delete("page");
      const qs = next.toString();
      const path = opts.pathname ?? pathname;
      router.push(qs ? `${path}?${qs}` : path, { scroll: false });
    },
    [params, pathname, router],
  );

  return { params, update };
}

/**
 * The selected subcategory and a way to change it. On a category page the subcategory is part of the
 * path (/services/<category>/<sub>), so choosing one moves to that page and keeps the other filters;
 * on the search page it is the `sub` query value.
 */
export function useSubcategory(lockedCategory?: Category, lockedSub?: string) {
  const { params, update } = useUrlParams();
  const selected = lockedCategory ? (lockedSub ?? null) : params.get("sub");
  const select = useCallback(
    (slug: string | null) => {
      if (lockedCategory) update({ sub: null }, { pathname: serviceHref(lockedCategory.slug, slug) });
      else update(slug ? { sub: slug, q: null } : { sub: null });
    },
    [lockedCategory, update],
  );
  return { selected, select };
}
