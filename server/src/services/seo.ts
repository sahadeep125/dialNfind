import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

/**
 * SEO for one provider profile page (/providers/:slug): the <title> and meta description the website shows to
 * search engines, the phrase each page targets ("electrician in Siliguri"), and a 0-100 score with checks and
 * suggestions for the provider apps and the admin console. Everything here is pure except the loaders at the
 * bottom, so the live check (POST /provider/seo/check), the cached score (recalculateProvider) and the website
 * all agree.
 */

export const BRAND = "KaajVa";
const BRAND_SUFFIX = ` | ${BRAND}`;

/** What search results show in full. */
export const SEO_LIMITS = {
  title: { min: 45, max: 60 },
  description: { min: 120, max: 160 },
  /** Hard limits, also enforced by the database columns. */
  titleMax: 70,
  titleMinInput: 10,
  descriptionMax: 200,
  descriptionMinInput: 50,
  focusKeywordMax: 80,
  focusKeywordWords: 8,
  keywordMax: 60,
  keywordsMax: 10,
  /** A description this long (in words) tells customers and search engines enough to go on. */
  descriptionWords: 80,
  descriptionWordsMin: 40,
  introWords: 60,
  photos: 4,
  serviceAreas: 2,
} as const;

/**
 * The words people type for each category, singular and specific ("plumber in Siliguri", not "plumbing in
 * Siliguri"). See seo/kaajva-keyword-map.md. Unknown categories use their own name.
 */
const SERVICE_TERMS: Record<string, string> = {
  "electronics-repair": "Electronics Repair",
  "home-appliances": "Appliance Repair",
  electricians: "Electrician",
  plumbing: "Plumber",
  carpentry: "Carpenter",
  cleaning: "Cleaning Services",
  "pest-control": "Pest Control",
  painting: "House Painter",
  "packers-movers": "Packers and Movers",
  tutors: "Home Tutor",
  "beauty-salon": "Beauty Salon",
  "vehicle-repair": "Vehicle Repair",
};
/** Broad categories where people search for the specific job ("TV repair", "AC repair"), so the subcategory leads. */
const SEARCHED_BY_SUBCATEGORY = new Set(["electronics-repair", "home-appliances", "vehicle-repair", "cleaning", "pest-control", "beauty-salon"]);

/** "Salon at Home (Women)" -> "Salon at Home"; "AC Repair & Service" -> "AC Repair and Service". */
function tidyServiceName(name: string): string {
  return squash(name.replace(/\([^)]*\)/g, " ").replace(/\s*&\s*/g, " and "));
}

/** The service a profile is found for: its primary service's searched term. */
export function serviceTermOf(primary: { category: { slug: string; name: string }; subcategory: { name: string } | null } | null | undefined): string {
  if (!primary) return "Local Services";
  const { category, subcategory } = primary;
  if (subcategory && SEARCHED_BY_SUBCATEGORY.has(category.slug)) return tidyServiceName(subcategory.name);
  return SERVICE_TERMS[category.slug] ?? tidyServiceName(category.name);
}

export interface SeoInput {
  name: string;
  /** "Electrician", "TV Repair": what the page is found for. */
  service: string;
  city: string;
  locality: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  focusKeyword: string | null;
  seoKeywords: string[];
  description: string | null;
  avgRating: number;
  totalReviews: number;
  hasLogo: boolean;
  hasCover: boolean;
  /** Work photos; their titles become the images' alt text. */
  photos: { title: string }[];
  services: number;
  pricedServices: number;
  serviceAreas: number;
  addressLine: string | null;
  pincode: string | null;
  hours: number;
  hasExtraContact: boolean;
  /** Other providers whose custom page title is the same as this one's. */
  duplicateTitles: number;
  status: "pending" | "active" | "rejected" | "suspended";
  noIndex: boolean;
}

export type SeoStatus = "pass" | "warn" | "fail";
export type SeoCategory = "search" | "keywords" | "content" | "media" | "details";

export interface SeoCheck {
  key: string;
  category: SeoCategory;
  label: string;
  status: SeoStatus;
  weight: number;
  earned: number;
  /** What was found, e.g. "58 characters". */
  message: string;
  /** What to do about it; null when it passes. */
  suggestion: string | null;
}

export interface SeoAnalysis {
  score: number;
  grade: "good" | "fair" | "poor";
  /** The <title> and meta description the website uses. */
  title: string;
  description: string;
  titleSource: "custom" | "automatic";
  descriptionSource: "custom" | "automatic";
  /** The service the page is found for ("Electrician", "TV Repair"). */
  service: string;
  /** The search this page targets: the provider's own focus keyword, or "<service> in <city>". */
  focusKeyword: string;
  focusKeywordSource: "custom" | "automatic";
  /** Searches the page also answers, for the keywords meta tag and structured data. */
  keywords: string[];
  /** Whether search engines may show the page, and why not. */
  indexable: boolean;
  notIndexedReason: string | null;
  checks: SeoCheck[];
  /** The failing and warning checks, most valuable first. */
  suggestions: { key: string; text: string; points: number }[];
  counts: { titleLength: number; descriptionLength: number; descriptionWords: number; keywordDensity: number; photos: number; photosWithAltText: number };
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** Lowercase words without accents or punctuation, for keyword matching. */
export function normalize(s: string): string {
  return squash(
    s
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^\p{L}\p{N}]+/gu, " "),
  );
}

export function words(s: string | null | undefined): string[] {
  return s ? normalize(s).split(" ").filter(Boolean) : [];
}

/** How many times the phrase occurs as whole words. */
export function occurrences(text: string | null | undefined, phrase: string | null | undefined): number {
  const hay = words(text);
  const needle = words(phrase);
  if (!needle.length || hay.length < needle.length) return 0;
  let n = 0;
  for (let i = 0; i <= hay.length - needle.length; i++) {
    if (needle.every((w, j) => hay[i + j] === w)) n++;
  }
  return n;
}

/** "full" when the phrase is there, "partial" when all its words are but not together. */
export function matchOf(text: string | null | undefined, phrase: string | null | undefined): "full" | "partial" | "none" {
  if (occurrences(text, phrase) > 0) return "full";
  const hay = new Set(words(text));
  const needle = words(phrase);
  return needle.length > 0 && needle.every((w) => hay.has(w)) ? "partial" : "none";
}

export function sentences(text: string): string[] {
  return text
    .split(/[.!?]+(?:\s|$)|\n+/)
    .map((s) => s.trim())
    .filter((s) => words(s).length > 0);
}

/** True when most letters are capitals, e.g. "SHARMA ELECTRICALS". */
export function isShouting(s: string): boolean {
  const letters = s.replace(/[^\p{L}]/gu, "");
  if (letters.length < 5) return false;
  const upper = letters.replace(/[^\p{Lu}]/gu, "").length;
  return upper / letters.length > 0.7;
}

/** What makes a business name look like spam to search engines and customers. */
export function nameProblems(name: string): string[] {
  const problems: string[] = [];
  if (isShouting(name)) problems.push("written in capitals");
  if (/\d{6,}/.test(name.replace(/[\s-]/g, ""))) problems.push("contains a phone number");
  if (/\b(best|no\.?\s?1|number one|cheapest|top\s?\d*|near me)\b/i.test(name)) problems.push("contains promotional words");
  if (/[!*#@$]{1,}|(.)\1{3,}/.test(name)) problems.push("uses symbols");
  if (name.length > 60) problems.push("is very long");
  return problems;
}

const GENERIC_PHOTO_WORDS = new Set(["img", "image", "images", "photo", "photos", "pic", "pics", "picture", "dsc", "whatsapp", "screenshot", "untitled", "new", "file", "jpeg", "jpg", "png", "webp", "copy", "final", "edited"]);

/** Photo titles that say nothing about the photo, such as "IMG_2034", "photo 1" or the business name again. */
export function isGenericPhotoTitle(title: string, businessName: string): boolean {
  const t = normalize(title);
  if (t === normalize(businessName)) return true;
  // What is left once camera and placeholder words and numbers are gone must still say something.
  const meaningful = t
    .split(" ")
    .filter((w) => w.length >= 3 && !/\d/.test(w) && !GENERIC_PHOTO_WORDS.has(w));
  return t.length < 8 || meaningful.length < 2;
}

/** Cuts text at a word boundary without an ellipsis (for titles). */
export function cutWords(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const at = cut.lastIndexOf(" ");
  return (at > max / 2 ? cut.slice(0, at) : text.slice(0, max)).replace(/[,;:.\s&|–-]+$/, "");
}

/** Shortens a description at a word boundary with an ellipsis, so it never ends mid-word. */
export function clipDescription(text: string, max: number = SEO_LIMITS.description.max): string {
  const clean = squash(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\s-]+$/, "")}…`;
}

// ---------------------------------------------------------------------------
// The page title, description and keywords
// ---------------------------------------------------------------------------

type TitleInput = Pick<SeoInput, "name" | "service" | "city" | "locality" | "seoTitle">;

const sameWords = (a: string | null | undefined, b: string | null | undefined) => !!a && !!b && normalize(a) === normalize(b);
/** The locality when it adds something to the city ("Pradhan Nagar"), else null. */
const localityOf = (i: Pick<SeoInput, "city" | "locality">) => (i.locality && !sameWords(i.locality, i.city) && !normalize(i.locality).includes(normalize(i.city)) ? squash(i.locality) : null);

/** The search a profile is found for when the provider has not picked one: "electrician in Siliguri". */
export function automaticFocusKeyword(i: Pick<SeoInput, "service" | "city">): string {
  return `${i.service.toLowerCase()} in ${squash(i.city)}`;
}

/**
 * The automatic title: the business name with the exact search people type ("Electrician in Siliguri"), plus the
 * locality when it fits. "Sharma Electricals, Pradhan Nagar: Electrician in Siliguri | KaajVa".
 */
function automaticTitle(i: TitleInput): string {
  const room = SEO_LIMITS.title.max - BRAND_SUFFIX.length;
  const name = squash(i.name);
  const city = squash(i.city);
  const locality = localityOf(i);
  // "Raju Plumber" already names the service; "Raju Plumber: Plumber in Siliguri" would repeat it.
  const named = matchOf(name, i.service) !== "none";
  const options = named
    ? [...(locality ? [`${name}, ${locality}, ${city}`] : []), `${name} in ${city}`, `${name}, ${city}`]
    : [...(locality ? [`${name}, ${locality}: ${i.service} in ${city}`] : []), `${name}: ${i.service} in ${city}`, `${i.service} in ${city}: ${name}`, `${name}, ${city}`];
  return options.find((t) => t.length <= room) ?? options.find((t) => t.length <= SEO_LIMITS.title.max) ?? name;
}

/**
 * The full <title>, at most 60 characters: the page's own words plus " | KaajVa" when it fits. A custom title that
 * is already 52-60 characters is kept whole rather than cut to make room for the brand.
 */
export function pageTitle(i: TitleInput): string {
  const base = squash(i.seoTitle || automaticTitle(i));
  const max = SEO_LIMITS.title.max;
  if (base.toLowerCase().includes(BRAND.toLowerCase())) return cutWords(base, max);
  if (base.length + BRAND_SUFFIX.length <= max) return `${base}${BRAND_SUFFIX}`;
  return cutWords(base, max);
}

/**
 * The meta description, at most 160 characters. The automatic one always opens with what and where
 * ("Electrician in Siliguri (Pradhan Nagar)"), and always ends with the reason to click.
 */
export function pageDescription(i: Pick<SeoInput, "name" | "service" | "city" | "locality" | "seoDescription" | "description" | "avgRating" | "totalReviews">): string {
  if (i.seoDescription && squash(i.seoDescription)) return clipDescription(i.seoDescription);
  const locality = localityOf(i);
  const lead = `${squash(i.name)}: ${i.service} in ${squash(i.city)}${locality ? ` (${locality})` : ""}.`;
  const cta = ` Call directly on ${BRAND}, no booking fee.`;
  const rating = i.totalReviews > 0 ? ` Rated ${i.avgRating.toFixed(1)}/5 from ${i.totalReviews} review${i.totalReviews === 1 ? "" : "s"}.` : "";
  const about = squash(i.description ?? "");
  const room = SEO_LIMITS.description.max - lead.length - cta.length - rating.length - 1;
  const middle = about && room > 30 ? ` ${clipDescription(about, room)}` : about ? "" : " See services, prices, hours and reviews.";
  return clipDescription(`${lead}${rating}${middle}${cta}`);
}

/** Related searches for the keywords tag and structured data: the provider's own, then the usual ones for a business. */
export function pageKeywords(i: Pick<SeoInput, "name" | "service" | "city" | "locality" | "focusKeyword" | "seoKeywords">): string[] {
  const city = squash(i.city);
  const locality = localityOf(i);
  const list = [
    i.focusKeyword ? squash(i.focusKeyword) : automaticFocusKeyword(i),
    ...i.seoKeywords,
    `${i.service.toLowerCase()} near me`,
    ...(locality ? [`${i.service.toLowerCase()} in ${locality}`] : []),
    `${squash(i.name)} ${city}`,
    `${squash(i.name)} phone number`,
  ];
  const seen = new Set<string>();
  return list.filter((k) => k && !seen.has(normalize(k)) && seen.add(normalize(k))).slice(0, 12);
}

// ---------------------------------------------------------------------------
// The score
// ---------------------------------------------------------------------------

type Draft = Omit<SeoCheck, "earned" | "suggestion"> & { suggestion: string; earned?: number };

/** A passing check earns its full weight; `earned` is the partial credit for a warning or failure. */
function check(c: Draft): SeoCheck {
  const earned = c.status === "pass" ? c.weight : (c.earned ?? 0);
  return { ...c, earned: Math.max(0, Math.min(c.weight, Math.round(earned))), suggestion: c.status === "pass" ? null : c.suggestion };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function analyzeSeo(i: SeoInput): SeoAnalysis {
  const L = SEO_LIMITS;
  const title = pageTitle(i);
  const description = pageDescription(i);
  const customKeyword = !!(i.focusKeyword && squash(i.focusKeyword));
  const keyword = customKeyword ? squash(i.focusKeyword!) : automaticFocusKeyword(i);
  const body = i.description ?? "";
  const bodyWords = words(body);
  const keywordWords = words(keyword).length;
  const keywordHits = occurrences(body, keyword);
  // Uses of the phrase per 100 words, as most SEO tools count it.
  const density = bodyWords.length && keywordWords ? Math.round((keywordHits / bodyWords.length) * 1000) / 10 : 0;
  const customTitle = !!(i.seoTitle && squash(i.seoTitle));
  const customDescription = !!(i.seoDescription && squash(i.seoDescription));
  const city = squash(i.city);
  const checks: SeoCheck[] = [];

  // Search appearance (35) ----------------------------------------------------------------------
  {
    const n = title.length;
    const base = customTitle ? squash(i.seoTitle!) : "";
    const cut = customTitle && base.length > L.title.max;
    const inRange = n >= L.title.min && n <= L.title.max;
    // The automatic title is written to fit, so it usually passes too.
    checks.push(
      check({
        key: "title_length",
        category: "search",
        label: "Page title length",
        weight: 8,
        status: inRange && !cut ? "pass" : n >= 35 && !cut ? "warn" : "fail",
        earned: cut ? 3 : n >= 35 ? 5 : 2,
        message: `${n} characters${customTitle ? "" : " (automatic title)"}${cut ? `; your title is ${base.length} and gets cut` : ""}`,
        suggestion: cut
          ? `Shorten the SEO title to ${L.title.max} characters or fewer so search results show all of it.`
          : `Make the title ${L.title.min}-${L.title.max} characters with your name, your service and ${city}; it is ${n} now.`,
      }),
    );
  }
  {
    const m = matchOf(title, keyword);
    checks.push(
      check({
        key: "title_keyword",
        category: "search",
        label: "Focus keyword in the title",
        weight: 8,
        status: m === "full" ? "pass" : m === "partial" ? "warn" : "fail",
        earned: m === "partial" ? 4 : undefined,
        message: m === "full" ? `“${keyword}” found` : m === "partial" ? "Its words are there, but not together" : `“${keyword}” is not in the title`,
        suggestion: `Put “${keyword}” in the SEO title, ideally right after your business name.`,
      }),
    );
  }
  {
    const hasService = matchOf(title, i.service) === "full";
    const hasCity = occurrences(title, city) > 0;
    checks.push(
      check({
        key: "title_service_city",
        category: "search",
        label: "Service and city in the title",
        weight: 6,
        status: hasService && hasCity ? "pass" : hasService || hasCity ? "warn" : "fail",
        earned: hasService !== hasCity ? 3 : undefined,
        message: hasService && hasCity ? "Both found" : hasService ? `${city} is missing` : hasCity ? `“${i.service}” is missing` : "Neither is there",
        suggestion: `Customers search “${i.service.toLowerCase()} in ${city}”. Name both your service and ${city} in the title.`,
      }),
    );
  }
  {
    const n = customDescription ? squash(i.seoDescription!).length : description.length;
    const inRange = n >= L.description.min && n <= L.description.max;
    checks.push(
      check({
        key: "meta_length",
        category: "search",
        label: "Meta description length",
        weight: 7,
        status: inRange ? (customDescription ? "pass" : "warn") : customDescription && n >= 100 ? "warn" : "fail",
        earned: inRange ? 5 : customDescription && n >= 100 ? 4 : 2,
        message: `${n} characters${customDescription ? "" : " (automatic)"}`,
        suggestion: !customDescription
          ? `Write your own meta description of ${L.description.min}-${L.description.max} characters: what you do, where, and why customers should call you.`
          : n > L.description.max
            ? `Shorten the meta description to ${L.description.max} characters; search results cut the rest.`
            : `Lengthen the meta description to at least ${L.description.min} characters.`,
      }),
    );
  }
  {
    const m = matchOf(description, keyword);
    checks.push(
      check({
        key: "meta_keyword",
        category: "search",
        label: "Focus keyword in the meta description",
        weight: 6,
        status: m === "full" ? "pass" : m === "partial" ? "warn" : "fail",
        earned: m === "partial" ? 3 : undefined,
        message: m === "full" ? "Found" : m === "partial" ? "Its words are there, but not together" : "Not in the description",
        suggestion: `Use “${keyword}” once in the meta description; Google shows it in bold when it matches the search.`,
      }),
    );
  }

  // Keywords (12) -------------------------------------------------------------------------------
  checks.push(
    check({
      key: "focus_keyword",
      category: "keywords",
      label: "Focus keyword",
      weight: 4,
      status: !customKeyword ? "warn" : keywordWords > 6 ? "warn" : matchOf(keyword, city) === "none" && matchOf(keyword, i.locality) === "none" && !/near me/i.test(keyword) ? "warn" : "pass",
      earned: 2,
      message: customKeyword ? `“${keyword}”` : `Automatic: “${keyword}”`,
      suggestion: !customKeyword
        ? `Pick the search your customers type, e.g. “${i.service.toLowerCase()} in ${city}” or a more specific job such as “inverter repair in ${city}”.`
        : keywordWords > 6
          ? "Use a shorter phrase (2-6 words) that people actually search for."
          : `Add the place to your focus keyword (“${keyword} in ${city}”); high-intent searches name the city or say “near me”.`,
    }),
  );
  {
    const n = i.seoKeywords.length;
    checks.push(
      check({
        key: "secondary_keywords",
        category: "keywords",
        label: "Secondary keywords",
        weight: 3,
        status: n >= 2 ? "pass" : n === 1 ? "warn" : "fail",
        earned: n === 1 ? 1 : undefined,
        message: plural(n, "keyword"),
        suggestion: `Add 2-8 related searches, e.g. “${i.service.toLowerCase()} near me” or “${squash(i.name)} phone number”.`,
      }),
    );
  }
  {
    const intro = bodyWords.slice(0, L.introWords).join(" ");
    const m = matchOf(intro, keyword);
    const serviceAndCity = matchOf(intro, i.service) !== "none" && occurrences(intro, city) > 0;
    checks.push(
      check({
        key: "keyword_intro",
        category: "keywords",
        label: "Focus keyword in the opening",
        weight: 3,
        status: m === "full" ? "pass" : m === "partial" || serviceAndCity ? "warn" : "fail",
        earned: m === "partial" || serviceAndCity ? 2 : undefined,
        message: !bodyWords.length ? "No description" : m === "full" ? `In the first ${L.introWords} words` : `Not in the first ${L.introWords} words`,
        suggestion: `Mention “${keyword}” in the first sentence of your business description.`,
      }),
    );
  }
  {
    const stuffed = density > 4;
    const ok = keywordHits > 0 && !stuffed;
    checks.push(
      check({
        key: "keyword_density",
        category: "keywords",
        label: "Keyword use in the description",
        weight: 2,
        status: ok ? "pass" : stuffed ? "fail" : "warn",
        message: `${plural(keywordHits, "time")} (${density}%)`,
        suggestion: stuffed ? `“${keyword}” is repeated too often (${density}%). Keep it under 4% so it reads naturally.` : `Use “${keyword}” once or twice in your description.`,
      }),
    );
  }

  // Content (23) --------------------------------------------------------------------------------
  {
    const n = bodyWords.length;
    checks.push(
      check({
        key: "description_length",
        category: "content",
        label: "Business description",
        weight: 10,
        status: n >= L.descriptionWords ? "pass" : n >= L.descriptionWordsMin ? "warn" : "fail",
        earned: n >= L.descriptionWords ? 10 : n >= L.descriptionWordsMin ? 6 : n >= 15 ? 2 : 0,
        message: plural(n, "word"),
        suggestion: `Write at least ${L.descriptionWords} words: the jobs you do, brands you work on, your experience, the areas of ${city} you cover and how fast you reach customers.`,
      }),
    );
  }
  {
    const problems = nameProblems(i.name);
    checks.push(
      check({
        key: "business_name",
        category: "content",
        label: "Business name",
        weight: 5,
        status: problems.length ? "fail" : "pass",
        message: problems.length ? `The name ${problems.join(", ")}` : "Looks right",
        suggestion: "Use your real business name in normal case (“Sharma Electricals”, not “SHARMA ELECTRICALS BEST ELECTRICIAN 98xxxx”). Google can drop listings whose names are stuffed with keywords.",
      }),
    );
  }
  {
    const s = sentences(body);
    const avg = s.length ? Math.round(s.reduce((a, x) => a + words(x).length, 0) / s.length) : 0;
    checks.push(
      check({
        key: "readability",
        category: "content",
        label: "Easy to read",
        weight: 4,
        status: !s.length ? "fail" : avg <= 22 ? "pass" : avg <= 30 ? "warn" : "fail",
        earned: s.length && avg > 22 && avg <= 30 ? 2 : undefined,
        message: s.length ? `Sentences average ${avg} words` : "No description",
        suggestion: s.length ? "Use shorter sentences (under 22 words on average); most customers read on a phone." : "Write a business description first.",
      }),
    );
  }
  checks.push(
    check({
      key: "unique_title",
      category: "content",
      label: "Unique title",
      weight: 4,
      status: i.duplicateTitles === 0 ? "pass" : "fail",
      message: i.duplicateTitles === 0 ? "No other listing uses it" : `${plural(i.duplicateTitles, "other listing")} use the same title`,
      suggestion: "Make the title unique to your business; identical titles compete with each other in search.",
    }),
  );

  // Photos (18) ---------------------------------------------------------------------------------
  checks.push(
    check({
      key: "logo",
      category: "media",
      label: "Logo or profile photo",
      weight: 4,
      status: i.hasLogo ? "pass" : "fail",
      message: i.hasLogo ? "Added" : "Missing",
      suggestion: "Upload your logo or a clear photo of yourself; it shows next to your name in search results and on Google.",
    }),
  );
  checks.push(
    check({
      key: "cover",
      category: "media",
      label: "Cover image",
      weight: 4,
      status: i.hasCover ? "pass" : "fail",
      message: i.hasCover ? "Added" : "Missing",
      suggestion: "Add a cover image (your shop, van or team at work); it is the preview when your page is shared on WhatsApp.",
    }),
  );
  {
    const n = i.photos.length;
    checks.push(
      check({
        key: "photos",
        category: "media",
        label: "Work photos",
        weight: 5,
        status: n >= L.photos ? "pass" : n > 0 ? "warn" : "fail",
        earned: n > 0 && n < L.photos ? Math.round((n / L.photos) * 4) : undefined,
        message: plural(n, "photo"),
        suggestion: `Add at least ${L.photos} photos of real jobs; pages with photos show up in Google Images and get more calls.`,
      }),
    );
  }
  const describedPhotos = i.photos.filter((p) => !isGenericPhotoTitle(p.title, i.name)).length;
  {
    const n = i.photos.length;
    const share = n ? describedPhotos / n : 0;
    checks.push(
      check({
        key: "alt_text",
        category: "media",
        label: "Photo titles (alt text)",
        weight: 5,
        status: n && share >= 0.8 ? "pass" : describedPhotos > 0 ? "warn" : "fail",
        earned: n && share < 0.8 && describedPhotos > 0 ? Math.round(share * 4) : undefined,
        message: n ? `${describedPhotos} of ${n} have a descriptive title` : "No photos",
        suggestion: `Give each photo a title that says what it shows (“Split AC installation in Pradhan Nagar”, not “IMG_2034”); titles become the alt text Google reads.`,
      }),
    );
  }

  // Listing details (12) ------------------------------------------------------------------------
  checks.push(
    check({
      key: "service_prices",
      category: "details",
      label: "Services with prices",
      weight: 3,
      status: i.pricedServices > 0 ? "pass" : i.services > 0 ? "warn" : "fail",
      earned: i.pricedServices === 0 && i.services > 0 ? 1 : undefined,
      message: `${i.pricedServices} of ${plural(i.services, "service")} priced`,
      suggestion: "Add a starting price to your services; prices show in search results and help customers choose you.",
    }),
  );
  {
    const n = i.serviceAreas;
    checks.push(
      check({
        key: "service_areas",
        category: "details",
        label: "Service areas",
        weight: 3,
        status: n >= L.serviceAreas ? "pass" : n > 0 ? "warn" : "fail",
        earned: n > 0 && n < L.serviceAreas ? 2 : undefined,
        message: plural(n, "area"),
        suggestion: `List the areas you serve (Pradhan Nagar, Matigara, Sevoke Road...); people search for services in their own area.`,
      }),
    );
  }
  {
    const full = !!(i.addressLine && i.pincode);
    checks.push(
      check({
        key: "address",
        category: "details",
        label: "Address and PIN code",
        weight: 3,
        status: full ? "pass" : i.addressLine || i.pincode ? "warn" : "fail",
        earned: !full && (i.addressLine || i.pincode) ? 1 : undefined,
        message: full ? "Complete" : i.addressLine ? "No PIN code" : i.pincode ? "No street address" : "Missing",
        suggestion: "Add your street address and PIN code; they feed the map and Google's local results.",
      }),
    );
  }
  checks.push(
    check({
      key: "hours",
      category: "details",
      label: "Working hours",
      weight: 2,
      status: i.hours > 0 ? "pass" : "fail",
      message: i.hours > 0 ? "Set" : "Not set",
      suggestion: "Set your working hours; Google shows “Open now” for searches like “electrician open now”.",
    }),
  );
  checks.push(
    check({
      key: "contact",
      category: "details",
      label: "WhatsApp, email or website",
      weight: 1,
      status: i.hasExtraContact ? "pass" : "fail",
      message: i.hasExtraContact ? "Added" : "Phone only",
      suggestion: "Add a WhatsApp number, email or website so customers have more ways to reach you.",
    }),
  );

  const score = checks.reduce((a, c) => a + c.earned, 0);
  const suggestions = checks
    .filter((c) => c.status !== "pass" && c.suggestion)
    .map((c) => ({ key: c.key, text: c.suggestion!, points: c.weight - c.earned }))
    .sort((a, b) => b.points - a.points);
  const notIndexedReason = i.noIndex
    ? "The KaajVa team has hidden this page from search engines."
    : i.status !== "active"
      ? i.status === "pending"
        ? "The listing is waiting for approval; search engines see it once it is live."
        : "The listing is not live, so search engines cannot see it."
      : null;
  return {
    score,
    grade: score >= 80 ? "good" : score >= 50 ? "fair" : "poor",
    title,
    description,
    titleSource: customTitle ? "custom" : "automatic",
    descriptionSource: customDescription ? "custom" : "automatic",
    service: i.service,
    focusKeyword: keyword,
    focusKeywordSource: customKeyword ? "custom" : "automatic",
    keywords: pageKeywords(i),
    indexable: !notIndexedReason,
    notIndexedReason,
    checks,
    suggestions,
    counts: {
      titleLength: title.length,
      descriptionLength: description.length,
      descriptionWords: bodyWords.length,
      keywordDensity: density,
      photos: i.photos.length,
      photosWithAltText: describedPhotos,
    },
  };
}

/** The alt text for a work photo on the public page: its title, plus the business and place when the title lacks them. */
export function photoAltText(title: string, p: { name: string; service: string; city: string }): string {
  const t = squash(title);
  if (!t || isGenericPhotoTitle(t, p.name)) return `${p.service} work by ${squash(p.name)}, ${squash(p.city)}`;
  return matchOf(t, p.name) === "full" ? t : `${t} by ${squash(p.name)}, ${squash(p.city)}`;
}

// ---------------------------------------------------------------------------
// Loading a provider
// ---------------------------------------------------------------------------

type Db = Prisma.TransactionClient | typeof prisma;

export const seoInclude = {
  services: {
    select: { startingPrice: true, isPrimary: true, category: { select: { slug: true, name: true } }, subcategory: { select: { name: true } } },
    orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
  },
  portfolio: { select: { title: true } },
  _count: { select: { businessHours: true, serviceAreas: true } },
} satisfies Prisma.ProviderInclude;

type SeoRow = Prisma.ProviderGetPayload<{ include: typeof seoInclude }>;

export function seoInputOf(p: SeoRow, duplicateTitles: number): SeoInput {
  const primary = p.services.find((s) => s.isPrimary) ?? p.services[0];
  return {
    name: p.businessName,
    service: serviceTermOf(primary),
    city: p.city,
    locality: p.locality,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    focusKeyword: p.focusKeyword,
    seoKeywords: p.seoKeywords,
    description: p.description,
    avgRating: Number(p.avgRating),
    totalReviews: p.totalReviews,
    hasLogo: !!p.logoUrl,
    hasCover: !!p.coverUrl,
    photos: p.portfolio,
    services: p.services.length,
    pricedServices: p.services.filter((s) => s.startingPrice !== null && Number(s.startingPrice) > 0).length,
    serviceAreas: p._count.serviceAreas,
    addressLine: p.addressLine,
    pincode: p.pincode,
    hours: p._count.businessHours,
    hasExtraContact: !!(p.whatsappNumber || p.email || p.website),
    duplicateTitles,
    status: p.status,
    noIndex: p.seoNoIndex,
  };
}

/** Other providers with this custom SEO title (case-insensitive). Automatic titles carry the business name, so they rarely clash. */
export async function countDuplicateTitles(db: Db, providerId: bigint, seoTitle: string | null): Promise<number> {
  const t = seoTitle ? squash(seoTitle) : "";
  if (!t) return 0;
  return db.provider.count({ where: { id: { not: providerId }, seoTitle: { equals: t, mode: "insensitive" } } });
}

/** Everything analyzeSeo needs for one provider; `draft` overlays unsaved edits for the live check. */
export async function loadSeoInput(db: Db, providerId: bigint, draft: Partial<SeoInput> = {}): Promise<SeoInput> {
  const p = await db.provider.findUniqueOrThrow({ where: { id: providerId }, include: seoInclude });
  const seoTitle = draft.seoTitle !== undefined ? draft.seoTitle : p.seoTitle;
  const duplicates = await countDuplicateTitles(db, providerId, seoTitle);
  return { ...seoInputOf(p, duplicates), ...draft, duplicateTitles: duplicates };
}

export async function providerSeo(providerId: bigint): Promise<SeoAnalysis> {
  return analyzeSeo(await loadSeoInput(prisma, providerId));
}

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

const noMarkup = (v: string) => !/[<>]/.test(v);
const optionalText = (min: number, max: number, label: string) =>
  z
    .string()
    .transform(squash)
    .refine((v) => v === "" || v.length >= min, `Write at least ${min} characters, or leave it empty`)
    .refine((v) => v.length <= max, `Keep the ${label} to ${max} characters or fewer`)
    .refine(noMarkup, "Remove the < and > characters")
    .nullable()
    .transform((v) => v || null);

/** The SEO fields a provider (or the team) can edit. Empty text means "write it automatically". */
export const seoFieldsSchema = z.object({
  seoTitle: optionalText(SEO_LIMITS.titleMinInput, SEO_LIMITS.titleMax, "SEO title"),
  seoDescription: optionalText(SEO_LIMITS.descriptionMinInput, SEO_LIMITS.descriptionMax, "meta description"),
  focusKeyword: optionalText(2, SEO_LIMITS.focusKeywordMax, "focus keyword").refine((v) => !v || v.split(" ").length <= SEO_LIMITS.focusKeywordWords, `Use ${SEO_LIMITS.focusKeywordWords} words or fewer`),
  seoKeywords: z
    .array(z.string().transform(squash).refine((v) => v.length >= 2 && v.length <= SEO_LIMITS.keywordMax, `Each keyword needs 2-${SEO_LIMITS.keywordMax} characters`).refine(noMarkup, "Remove the < and > characters"))
    .max(SEO_LIMITS.keywordsMax, `Use up to ${SEO_LIMITS.keywordsMax} secondary keywords`)
    .transform((list) => {
      const seen = new Set<string>();
      return list.filter((k) => !seen.has(k.toLowerCase()) && seen.add(k.toLowerCase()));
    }),
});

/** Unsaved editor text for the live SEO check: loose limits, so an over-long draft still gets advice instead of an error. */
const draftText = (max: number) => z.string().max(max).nullable().optional();
export const seoDraftSchema = z.object({
  businessName: draftText(200),
  description: draftText(5000),
  seoTitle: draftText(300),
  seoDescription: draftText(1000),
  focusKeyword: draftText(300),
  seoKeywords: z.array(z.string().max(300)).max(50).optional(),
});

/** The SEO analysis with unsaved edits applied; the editors call it as the provider types. */
export async function checkSeoDraft(providerId: bigint, draft: z.infer<typeof seoDraftSchema>): Promise<SeoAnalysis> {
  const { businessName, seoKeywords, ...text } = draft;
  const overlay: Partial<SeoInput> = Object.fromEntries(Object.entries(text).filter(([, v]) => v !== undefined));
  if (businessName) overlay.name = businessName;
  if (seoKeywords) overlay.seoKeywords = seoKeywords.map(squash).filter(Boolean);
  return analyzeSeo(await loadSeoInput(prisma, providerId, overlay));
}
