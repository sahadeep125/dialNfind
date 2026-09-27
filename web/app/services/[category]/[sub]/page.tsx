import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryListing, getCategory, listingMetadata } from "@/components/search/category-listing";
import type { SearchParamsRecord } from "@/components/search/results-section";
import { TrackView } from "@/components/site/track-view";

type Params = { category: string; sub: string };

/** The category and subcategory, or null when the subcategory does not belong to that category. */
async function load(categorySlug: string, subSlug: string) {
  const data = await getCategory(categorySlug);
  const sub = data?.category.subcategories.find((s) => s.slug === decodeURIComponent(subSlug));
  return data && sub ? { category: data.category, sub } : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { category, sub } = await params;
  const found = await load(category, sub);
  if (!found) return { title: "Services", robots: { index: false, follow: true } };
  return listingMetadata(found.category, found.sub);
}

export default async function SubcategoryListingPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<SearchParamsRecord> }) {
  const [{ category, sub }, sp] = await Promise.all([params, searchParams]);
  const found = await load(category, sub);
  if (!found) notFound();
  return (
    <>
      <TrackView event="category_viewed" properties={{ category: found.category.slug, subcategory: found.sub.slug }} />
      <CategoryListing category={found.category} sub={found.sub} searchParams={sp} />
    </>
  );
}
