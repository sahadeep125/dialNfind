/** Public address of a category page, or of one of its subcategories. Subcategory slugs are unique site-wide. */
export function serviceHref(categorySlug: string, subSlug?: string | null): string {
  const base = `/services/${encodeURIComponent(categorySlug)}`;
  return subSlug ? `${base}/${encodeURIComponent(subSlug)}` : base;
}
