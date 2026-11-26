export interface CategoryFaq {
  q: string;
  a: string;
}

/** The fields of a category that make up its public page for search engines. */
export interface CategoryPageContent {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoHeading?: string | null;
  seoContent?: string | null;
  faqs?: CategoryFaq[] | null;
}

/** The website adds this after every page title. */
export const TITLE_SUFFIX = " | KaajVa";

/** What is still missing from a category page, for the badge on the Categories list. */
export function pageContentGaps(c: CategoryPageContent): string[] {
  const gaps: string[] = [];
  if (!c.imageUrl) gaps.push("photo");
  if (!c.seoTitle || !c.seoDescription) gaps.push("search title and description");
  if ((c.seoContent ?? "").trim().split(/\s+/).filter(Boolean).length < 150) gaps.push("page text");
  if ((c.faqs?.length ?? 0) < 4) gaps.push("questions");
  return gaps;
}

