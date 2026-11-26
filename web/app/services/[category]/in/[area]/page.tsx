import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryListing, areaMetadata, getCategory, listingPage } from "@/components/search/category-listing";
import { fetchCategoryAreas } from "@/lib/category-areas";
import type { SearchParamsRecord } from "@/components/search/results-section";
import { TrackView } from "@/components/site/track-view";

type Params = { category: string; area: string };

/**
 * A "<service> in <area>" page, such as beauty parlours in Hakimpara. Only localities with 3 or more listings
 * in the category get one, so every page has real businesses on it; any other address is a 404.
 */
async function load(categorySlug: string, areaSlug: string) {
  const [data, areas] = await Promise.all([getCategory(categorySlug), fetchCategoryAreas()]);
  const slug = decodeURIComponent(areaSlug);
  const area = areas.find((a) => a.category === categorySlug && a.slug === slug);
  return data && area ? { category: data.category, area } : null;
}

export async function generateMetadata({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<SearchParamsRecord> }): Promise<Metadata> {
  const [{ category, area }, sp] = await Promise.all([params, searchParams]);
  const found = await load(category, area);
  if (!found) return { title: "Services", robots: { index: false, follow: true } };
  return areaMetadata(found.category, found.area, listingPage(sp));
}

export default async function AreaListingPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<SearchParamsRecord> }) {
  const [{ category, area }, sp] = await Promise.all([params, searchParams]);
  const found = await load(category, area);
  if (!found) notFound();
  return (
    <>
      <TrackView event="category_viewed" properties={{ category: found.category.slug, subcategory: null, area: found.area.slug }} />
      <CategoryListing category={found.category} area={found.area} searchParams={sp} />
    </>
  );
}
