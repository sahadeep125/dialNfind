import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export interface CategoryOption {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  subcategories: { id: number; name: string; slug: string; isActive: boolean }[];
}

/** Every category with its services, for pickers in the listing editors. */
export function useCategoryOptions() {
  return useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => api<{ categories: CategoryOption[] }>("/admin/categories").then((r) => r.categories),
    staleTime: 5 * 60 * 1000,
  });
}
