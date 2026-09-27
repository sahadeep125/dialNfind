"use client";

import { usePathname } from "next/navigation";
import { SearchBar } from "@/components/search/search-bar";

/** Pages that have no search box of their own get a slim one in the header, so a new search is always one step away. */
const WITH_HEADER_SEARCH = ["/providers/", "/guides/", "/dashboard", "/about", "/help", "/contact"];

export function HeaderSearch() {
  const pathname = usePathname();
  if (!WITH_HEADER_SEARCH.some((p) => pathname.startsWith(p))) return null;
  return <SearchBar variant="compact" size="md" className="hidden max-w-md xl:flex" />;
}
