import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryListing, getCategory, listingMetadata } from "@/components/search/category-listing";
import type { SearchParamsRecord } from "@/components/search/results-section";

type Params = { category: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { category: slug } = await params;
  const data = await getCategory(slug);
  if (!data) return { title: "Services" };
  return listingMetadata(data.category, undefined);
}

export default async function CategoryListingPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<SearchParamsRecord> }) {
  const [{ category: slug }, sp] = await Promise.all([params, searchParams]);
  const data = await getCategory(slug);
  if (!data) notFound();
  return <CategoryListing category={data.category} searchParams={sp} />;
}
