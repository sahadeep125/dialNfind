/**
 * Types for the editorial content that lives in the repository: search-focused copy for category and
 * subcategory pages, and the guides under /guides. Plain strings only; the pages add all the markup.
 */

export type Faq = { q: string; a: string };

/** Copy for a category or subcategory page. `title` is used before the " | DialNFind" suffix. */
export interface ServiceSeo {
  /** At most 50 characters, so the full title with the site suffix stays near 60. */
  title: string;
  /** At most 160 characters. */
  description: string;
  h1: string;
  /** Paragraphs shown under the results. */
  intro: string[];
  faqs: Faq[];
}

export interface GuideSection {
  heading: string;
  paragraphs: string[];
  /** Optional bullet list shown after the paragraphs. */
  list?: string[];
}

export interface Guide {
  slug: string;
  /** Shown as the H1. At most 70 characters. */
  title: string;
  /** The <title>, used before the " | DialNFind" suffix. At most 50 characters. */
  metaTitle: string;
  /** At most 160 characters. */
  description: string;
  /** Category slug the guide belongs to; the page links to that category. */
  category: string;
  /** Subcategory slugs the guide points readers to. */
  subcategories: string[];
  keywords: string[];
  datePublished: string;
  dateModified: string;
  /** Short lead paragraph shown under the title. */
  summary: string;
  sections: GuideSection[];
  faqs: Faq[];
}
