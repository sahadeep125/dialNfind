import { publicApi } from "./api";
import { serviceHref } from "./service-href";

/** A locality inside the city with enough listings in one category for its own page (server: GET /locations/category-areas). */
export interface CategoryArea {
  category: string;
  categoryName: string;
  area: string;
  slug: string;
  city: string;
  providers: number;
}

/** Every category and locality pair with 3 or more listings. Throws when the API fails, so an area page is never cached as a 404. */
export const fetchCategoryAreas = () =>
  publicApi<{ areas: CategoryArea[] }>("/locations/category-areas", { revalidate: 3600, tags: ["categories", "providers"] }).then((r) => r.areas);

/** The same list for links and the sitemap, where the areas are extras: a failure leaves them out. */
export const getCategoryAreas = () => fetchCategoryAreas().catch(() => [] as CategoryArea[]);

/** Public address of a "<service> in <area>" page. */
export const areaHref = (categorySlug: string, areaSlug: string) => `${serviceHref(categorySlug)}/in/${encodeURIComponent(areaSlug)}`;
