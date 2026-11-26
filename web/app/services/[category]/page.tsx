import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryListing, getCategory, listingMetadata, listingPage } from "@/components/search/category-listing";
import type { SearchParamsRecord } from "@/components/search/results-section";
import { TrackView } from "@/components/site/track-view";

type Params = { category: string };

export async function generateMetadata({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<SearchParamsRecord> }): Promise<Metadata> {
  const [{ category: slug }, sp] = await Promise.all([params, searchParams]);
  const data = await getCategory(slug);
  if (!data) return { title: "Services" };
  return listingMetadata(data.category, undefined, listingPage(sp));
}

export default async function CategoryListingPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<SearchParamsRecord> }) {
  const [{ category: slug }, sp] = await Promise.all([params, searchParams]);
  const data = await getCategory(slug);
  if (!data) notFound();
  return (
    <>
      <TrackView event="category_viewed" properties={{ category: data.category.slug, subcategory: null }} />
      <CategoryListing category={data.category} searchParams={sp} />
    </>
  );
}
