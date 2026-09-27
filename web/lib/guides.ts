import { GUIDES } from "@/content/guides";
import type { Guide } from "@/content/types";

export { GUIDES };

export const getGuide = (slug: string): Guide | undefined => GUIDES.find((g) => g.slug === slug);

export const guidesForCategory = (categorySlug: string): Guide[] => GUIDES.filter((g) => g.category === categorySlug);

/** Guides that point readers to this subcategory first, then the rest of its category. */
export function guidesForSubcategory(categorySlug: string, subSlug: string): Guide[] {
  const inCategory = guidesForCategory(categorySlug);
  return [...inCategory.filter((g) => g.subcategories.includes(subSlug)), ...inCategory.filter((g) => !g.subcategories.includes(subSlug))];
}

/** Reading time at about 200 words a minute. */
export function readingMinutes(guide: Guide): number {
  const text = [guide.summary, ...guide.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.list ?? [])]), ...guide.faqs.flatMap((f) => [f.q, f.a])].join(" ");
  return Math.max(1, Math.round(text.split(/\s+/).length / 200));
}
