/** The same limits as server/src/services/seo.ts SEO_LIMITS. */
export const SEO_LIMITS = {
  title: { min: 45, max: 60, hard: 70, minInput: 10 },
  description: { min: 120, max: 160, hard: 200, minInput: 50 },
  focusKeyword: { max: 80, words: 8 },
  keyword: { max: 60 },
  keywords: 10,
} as const;

export type SeoStatus = "pass" | "warn" | "fail";
export type SeoCategory = "search" | "keywords" | "content" | "media" | "details";

export interface SeoCheck {
  key: string;
  category: SeoCategory;
  label: string;
  status: SeoStatus;
  weight: number;
  earned: number;
  message: string;
  suggestion: string | null;
}

/** GET …/profile `seo` and POST …/seo/check (server/src/services/seo.ts SeoAnalysis). */
export interface SeoAnalysis {
  score: number;
  grade: "good" | "fair" | "poor";
  title: string;
  description: string;
  titleSource: "custom" | "automatic";
  descriptionSource: "custom" | "automatic";
  service: string;
  focusKeyword: string;
  focusKeywordSource: "custom" | "automatic";
  keywords: string[];
  indexable: boolean;
  notIndexedReason: string | null;
  checks: SeoCheck[];
  suggestions: { key: string; text: string; points: number }[];
  counts: { titleLength: number; descriptionLength: number; descriptionWords: number; keywordDensity: number; photos: number; photosWithAltText: number };
}

export function seoGrade(score: number): "good" | "fair" | "poor" {
  return score >= 80 ? "good" : score >= 50 ? "fair" : "poor";
}

/** "a, b | c\nd" -> ["a", "b", "c", "d"], trimmed, without repeats (ignoring case). */
export function splitKeywords(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(/[\n,|;]+/)
    .map((k) => k.replace(/\s+/g, " ").trim())
    .filter((k) => k && !seen.has(k.toLowerCase()) && seen.add(k.toLowerCase()));
}

export const squash = (v: string) => v.replace(/\s+/g, " ").trim();

/** Client-side copy of the API's rules (server/src/services/seo.ts seoFieldsSchema), so mistakes show before saving. */
export function seoFieldErrors(v: { seoTitle: string; seoDescription: string; focusKeyword: string; seoKeywords: string }): Partial<Record<"seoTitle" | "seoDescription" | "focusKeyword" | "seoKeywords", string>> {
  const L = SEO_LIMITS;
  const errors: Partial<Record<"seoTitle" | "seoDescription" | "focusKeyword" | "seoKeywords", string>> = {};
  const markup = (s: string) => /[<>]/.test(s);
  const title = squash(v.seoTitle);
  if (title && title.length < L.title.minInput) errors.seoTitle = `Write at least ${L.title.minInput} characters, or leave it empty for the automatic title`;
  else if (title.length > L.title.hard) errors.seoTitle = `Keep the SEO title to ${L.title.hard} characters or fewer`;
  else if (markup(title)) errors.seoTitle = "Remove the < and > characters";
  const desc = squash(v.seoDescription);
  if (desc && desc.length < L.description.minInput) errors.seoDescription = `Write at least ${L.description.minInput} characters, or leave it empty`;
  else if (desc.length > L.description.hard) errors.seoDescription = `Keep the meta description to ${L.description.hard} characters or fewer`;
  else if (markup(desc)) errors.seoDescription = "Remove the < and > characters";
  const kw = squash(v.focusKeyword);
  if (kw && kw.length < 2) errors.focusKeyword = "Enter at least 2 characters";
  else if (kw.length > L.focusKeyword.max) errors.focusKeyword = `Keep it to ${L.focusKeyword.max} characters`;
  else if (kw && kw.split(" ").length > L.focusKeyword.words) errors.focusKeyword = `Use ${L.focusKeyword.words} words or fewer`;
  else if (markup(kw)) errors.focusKeyword = "Remove the < and > characters";
  const list = splitKeywords(v.seoKeywords);
  if (list.length > L.keywords) errors.seoKeywords = `Use up to ${L.keywords} secondary keywords`;
  else if (list.some((k) => k.length < 2 || k.length > L.keyword.max)) errors.seoKeywords = `Each keyword needs 2-${L.keyword.max} characters`;
  else if (list.some(markup)) errors.seoKeywords = "Remove the < and > characters";
  return errors;
}

/** Which page fixes each SEO check (server/src/services/seo.ts check keys). */
export const SEO_CHECK_PAGE: Record<string, { to: string; label: string }> = {
  description_length: { to: "/profile", label: "Business details" },
  keyword_intro: { to: "/profile", label: "Business details" },
  keyword_density: { to: "/profile", label: "Business details" },
  readability: { to: "/profile", label: "Business details" },
  business_name: { to: "/profile", label: "Business details" },
  logo: { to: "/profile", label: "Business details" },
  cover: { to: "/profile", label: "Business details" },
  address: { to: "/profile", label: "Business details" },
  contact: { to: "/profile", label: "Business details" },
  photos: { to: "/portfolio", label: "Photos" },
  alt_text: { to: "/portfolio", label: "Photos" },
  service_prices: { to: "/services", label: "Services and prices" },
  service_areas: { to: "/areas", label: "Service areas" },
  hours: { to: "/hours", label: "Working hours" },
};
