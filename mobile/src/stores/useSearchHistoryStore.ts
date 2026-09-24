import { create } from "zustand";

import { STORAGE_KEYS, readJson, writeJson } from "@/services/storage";

interface SearchHistoryState {
  recent: string[];
  addSearch: (term: string) => void;
  clear: () => void;
}

const MAX_RECENT = 6;

export const useSearchHistoryStore = create<SearchHistoryState>((set, get) => ({
  recent: readJson<string[]>(STORAGE_KEYS.recentSearches) ?? [],
  addSearch: (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    const recent = [
      clean,
      ...get().recent.filter((t) => t.toLowerCase() !== clean.toLowerCase()),
    ].slice(0, MAX_RECENT);
    writeJson(STORAGE_KEYS.recentSearches, recent);
    set({ recent });
  },
  clear: () => {
    writeJson(STORAGE_KEYS.recentSearches, []);
    set({ recent: [] });
  },
}));
