import { describe, expect, it } from "vitest";
import {
  analyzeSeo,
  automaticFocusKeyword,
  isGenericPhotoTitle,
  matchOf,
  nameProblems,
  pageDescription,
  pageKeywords,
  pageTitle,
  photoAltText,
  serviceTermOf,
  type SeoInput,
} from "../../../src/services/seo.js";

const base: SeoInput = {
  name: "Sharma Electricals",
  service: "Electrician",
  city: "Siliguri",
  locality: "Pradhan Nagar",
  seoTitle: null,
  seoDescription: null,
  focusKeyword: null,
  seoKeywords: [],
  description: null,
  avgRating: 0,
  totalReviews: 0,
  hasLogo: false,
  hasCover: false,
  photos: [],
  services: 1,
  pricedServices: 0,
  serviceAreas: 0,
  addressLine: null,
  pincode: null,
  hours: 0,
  hasExtraContact: false,
  duplicateTitles: 0,
  status: "active",
  noIndex: false,
};

const strongDescription =
  "Sharma Electricals is a trusted electrician in Siliguri. We handle house wiring, inverter installation, fan and light fitting and switchboard repair. " +
  "Our team has worked across Pradhan Nagar, Hakimpara and Sevoke Road for twelve years. We reach most homes within an hour. " +
  "Every job comes with a written estimate before work starts. We carry spare parts from trusted brands. " +
  "Call us for emergency repairs, new connections, safety checks and meter shifting. We also wire shops and offices. " +
  "Customers like our clean work and fair prices. Ask about our yearly maintenance plan for homes and small businesses in North Bengal.";

describe("provider SEO text", () => {
  it("names the searched service for each category", () => {
    expect(serviceTermOf({ category: { slug: "plumbing", name: "Plumbing" }, subcategory: { name: "Leak Repair" } })).toBe("Plumber");
    expect(serviceTermOf({ category: { slug: "electronics-repair", name: "Electronics Repair" }, subcategory: { name: "TV Repair" } })).toBe("TV Repair");
    expect(serviceTermOf({ category: { slug: "home-appliances", name: "Home Appliances" }, subcategory: { name: "AC Repair & Service" } })).toBe("AC Repair and Service");
    expect(serviceTermOf({ category: { slug: "beauty-salon", name: "Beauty & Salon" }, subcategory: { name: "Salon at Home (Women)" } })).toBe("Salon at Home");
    expect(serviceTermOf({ category: { slug: "yoga", name: "Yoga Classes" }, subcategory: null })).toBe("Yoga Classes");
    expect(serviceTermOf(null)).toBe("Local Services");
  });

  it("writes a title with the exact search, the locality when it fits, and the brand", () => {
    expect(pageTitle({ ...base, name: "Raj Elec", locality: "Hakimpara" })).toBe("Raj Elec, Hakimpara: Electrician in Siliguri | KaajVa");
    // Too long with the locality and the brand: the brand stays, the locality goes.
    expect(pageTitle(base)).toBe("Sharma Electricals: Electrician in Siliguri | KaajVa");
    expect(pageTitle({ ...base, locality: null })).toBe("Sharma Electricals: Electrician in Siliguri | KaajVa");
    // The locality is the city itself: not repeated.
    expect(pageTitle({ ...base, locality: "Siliguri" })).toBe("Sharma Electricals: Electrician in Siliguri | KaajVa");
    // The name already says what the business does.
    expect(pageTitle({ ...base, name: "Raju Electrician", locality: null })).toBe("Raju Electrician in Siliguri | KaajVa");
    for (const name of ["A", "Maa Tara Electrical and Hardware Store Private Limited Company"]) expect(pageTitle({ ...base, name }).length).toBeLessThanOrEqual(60);
    // A custom title is used as written, with the brand when it fits.
    expect(pageTitle({ ...base, seoTitle: "Electrician in Siliguri for wiring and inverters" })).toBe("Electrician in Siliguri for wiring and inverters | KaajVa");
  });

  it("writes a description that opens with what and where and ends with the reason to call", () => {
    const d = pageDescription({ ...base, description: strongDescription, avgRating: 4.6, totalReviews: 12 });
    expect(d.startsWith("Sharma Electricals: Electrician in Siliguri (Pradhan Nagar). Rated 4.6/5 from 12 reviews.")).toBe(true);
    expect(d.endsWith("Call directly on KaajVa, no booking fee.")).toBe(true);
    expect(d.length).toBeLessThanOrEqual(160);
    expect(pageDescription(base)).toContain("See services, prices, hours and reviews.");
    expect(pageDescription({ ...base, seoDescription: "  Our own words.  " })).toBe("Our own words.");
  });

  it("targets '<service> in <city>' unless the provider picks a keyword", () => {
    expect(automaticFocusKeyword(base)).toBe("electrician in Siliguri");
    const keywords = pageKeywords({ ...base, seoKeywords: ["inverter repair Siliguri", "Electrician in Siliguri"] });
    expect(keywords).toEqual([
      "electrician in Siliguri",
      "inverter repair Siliguri",
      "electrician near me",
      "electrician in Pradhan Nagar",
      "Sharma Electricals Siliguri",
      "Sharma Electricals phone number",
    ]);
  });

  it("spots spammy names and photo titles that say nothing", () => {
    expect(nameProblems("Sharma Electricals")).toEqual([]);
    expect(nameProblems("SHARMA ELECTRICALS")).toContain("written in capitals");
    expect(nameProblems("Best Electrician 9876543210")).toEqual(expect.arrayContaining(["contains a phone number", "contains promotional words"]));
    expect(isGenericPhotoTitle("IMG_2034", "Sharma")).toBe(true);
    expect(isGenericPhotoTitle("WhatsApp Image 2024-05-01", "Sharma")).toBe(true);
    expect(isGenericPhotoTitle("Photo 1", "Sharma")).toBe(true);
    expect(isGenericPhotoTitle("Sharma Electricals", "Sharma Electricals")).toBe(true);
    expect(isGenericPhotoTitle("Inverter installation in Hakimpara", "Sharma")).toBe(false);
    expect(photoAltText("Inverter installation", { name: "Sharma Electricals", service: "Electrician", city: "Siliguri" })).toBe("Inverter installation by Sharma Electricals, Siliguri");
    expect(photoAltText("IMG_1", { name: "Sharma Electricals", service: "Electrician", city: "Siliguri" })).toBe("Electrician work by Sharma Electricals, Siliguri");
    expect(photoAltText("Sharma Electricals shop front", { name: "Sharma Electricals", service: "Electrician", city: "Siliguri" })).toBe("Sharma Electricals shop front");
  });

  it("matches phrases as whole words, ignoring case, punctuation and &", () => {
    expect(matchOf("Plumber in Siliguri!", "plumber in siliguri")).toBe("full");
    expect(matchOf("Plumber services in Siliguri", "plumber in siliguri")).toBe("partial");
    expect(matchOf("Siliguri plumber", "plumber in siliguri")).toBe("none");
    expect(matchOf("AC Repair & Service", "ac repair and service")).toBe("full");
  });
});

describe("provider SEO score", () => {
  it("scores an empty listing low and says what to do first", () => {
    const a = analyzeSeo(base);
    expect(a.grade).toBe("poor");
    expect(a.checks.reduce((n, c) => n + c.weight, 0)).toBe(100);
    expect(a.focusKeywordSource).toBe("automatic");
    expect(a.suggestions[0].key).toBe("description_length");
    expect(a.suggestions[0].points).toBe(10);
    expect(a.indexable).toBe(true);
  });

  it("scores a complete listing as good", () => {
    const a = analyzeSeo({
      ...base,
      description: strongDescription,
      seoTitle: "Sharma Electricals: Electrician in Siliguri, Pradhan Nagar",
      seoDescription: "Sharma Electricals is a trusted electrician in Siliguri for wiring, inverters and repairs. Same day visits in Pradhan Nagar and Hakimpara. Call now.",
      focusKeyword: "electrician in Siliguri",
      seoKeywords: ["inverter installation Siliguri", "house wiring Siliguri"],
      hasLogo: true,
      hasCover: true,
      photos: ["Inverter installation in Hakimpara", "New house wiring in Matigara", "Switchboard repair at a shop", "Ceiling fan fitting in Pradhan Nagar"].map((title) => ({ title })),
      pricedServices: 1,
      serviceAreas: 3,
      addressLine: "12 Hill Cart Road",
      pincode: "734001",
      hours: 7,
      hasExtraContact: true,
    });
    expect(a.checks.filter((c) => c.status !== "pass").map((c) => c.key)).toEqual([]);
    expect(a.checks.filter((c) => c.earned < c.weight).map((c) => c.key)).toEqual([]);
    expect(a.score).toBe(100);
    expect(a.grade).toBe("good");
    expect(a.title).toBe("Sharma Electricals: Electrician in Siliguri, Pradhan Nagar");
  });

  it("flags cut titles, duplicate titles, keyword stuffing, generic photo titles and hidden pages", () => {
    const a = analyzeSeo({
      ...base,
      seoTitle: "Sharma Electricals electrician in Siliguri wiring inverter fan light repair",
      focusKeyword: "electrician in Siliguri",
      description: "Electrician in Siliguri. Electrician in Siliguri. Electrician in Siliguri.",
      photos: [{ title: "IMG_1" }, { title: "Photo 2" }],
      duplicateTitles: 2,
      noIndex: true,
    });
    const by = Object.fromEntries(a.checks.map((c) => [c.key, c]));
    expect(by.title_length.status).toBe("fail");
    expect(by.title_length.message).toContain("gets cut");
    expect(by.unique_title.status).toBe("fail");
    expect(by.keyword_density.status).toBe("fail");
    expect(by.alt_text).toMatchObject({ status: "fail", message: "0 of 2 have a descriptive title" });
    expect(a.indexable).toBe(false);
    expect(a.notIndexedReason).toContain("hidden");
    expect(analyzeSeo({ ...base, status: "pending" }).notIndexedReason).toContain("waiting for approval");
  });

  it("gives partial credit and the right advice for each check", () => {
    const by = (over: Partial<SeoInput>) => Object.fromEntries(analyzeSeo({ ...base, ...over }).checks.map((c) => [c.key, c]));
    // Title: too short, kept with the brand, cut, keyword only partly there, service or city missing.
    expect(by({ seoTitle: "Sharma TV fixes" }).title_length).toMatchObject({ status: "fail", earned: 2 });
    expect(by({ seoTitle: "Sharma Electricals electrician fixes in town | KaajVa" }).title_length.status).toBe("pass");
    expect(pageTitle({ ...base, seoTitle: "A".repeat(65) })).toHaveLength(60);
    expect(pageTitle({ ...base, seoTitle: `${"Abc ".repeat(12)}Siliguri` })).toBe("Abc Abc Abc Abc Abc Abc Abc Abc Abc Abc Abc Abc Siliguri");
    expect(by({ seoTitle: "Siliguri's electrician Sharma, in business 12 years" }).title_keyword).toMatchObject({ status: "warn", earned: 4, message: "Its words are there, but not together" });
    expect(by({ seoTitle: "Sharma Electricals, trusted wiring experts nearby" }).title_service_city).toMatchObject({ status: "fail", message: "Neither is there" });
    expect(by({ seoTitle: "Sharma Electricals: trusted electrician nearby" }).title_service_city).toMatchObject({ status: "warn", message: "Siliguri is missing" });
    expect(by({ seoTitle: "Sharma Electricals: trusted wiring in Siliguri" }).title_service_city).toMatchObject({ status: "warn", message: "“Electrician” is missing" });
    expect(pageTitle({ ...base, name: "Raju Electrician" })).toBe("Raju Electrician, Pradhan Nagar, Siliguri | KaajVa");
    // Meta description: custom and too long, custom and a bit short, keyword partly there or missing.
    expect(by({ seoDescription: "x ".repeat(90) }).meta_length).toMatchObject({ status: "warn", suggestion: expect.stringMatching(/^Shorten/) });
    expect(by({ seoDescription: "word ".repeat(22) }).meta_length).toMatchObject({ status: "warn", earned: 4, suggestion: expect.stringMatching(/^Lengthen/) });
    expect(by({ seoDescription: "Siliguri electrician Sharma works in every ward." }).meta_keyword).toMatchObject({ status: "warn", earned: 3 });
    expect(by({ seoDescription: "Wiring, fans and lights for your home, done well and on time." }).meta_keyword.status).toBe("fail");
    // Focus keyword: too long, without a place, or with "near me".
    expect(by({ focusKeyword: "best cheap reliable fast house wiring service electrician" }).focus_keyword).toMatchObject({ status: "warn", suggestion: expect.stringMatching(/shorter phrase/) });
    expect(by({ focusKeyword: "house wiring" }).focus_keyword).toMatchObject({ status: "warn", suggestion: expect.stringMatching(/Add the place/) });
    expect(by({ focusKeyword: "electrician near me" }).focus_keyword.status).toBe("pass");
    expect(by({ focusKeyword: "electrician Pradhan Nagar" }).focus_keyword.status).toBe("pass");
    expect(by({ seoKeywords: ["one keyword"] }).secondary_keywords).toMatchObject({ status: "warn", earned: 1 });
    // Description: opening, length bands and readability.
    expect(by({ description: "Sharma is an electrician based in Siliguri." }).keyword_intro).toMatchObject({ status: "warn", earned: 2, message: "Not in the first 60 words" });
    expect(by({ description: "word ".repeat(50) }).description_length).toMatchObject({ status: "warn", earned: 6 });
    expect(by({ description: "word ".repeat(20) }).description_length).toMatchObject({ status: "fail", earned: 2 });
    expect(by({ description: `${"word ".repeat(25)}.` }).readability).toMatchObject({ status: "warn", earned: 2 });
    expect(by({ description: `${"word ".repeat(40)}.` }).readability.status).toBe("fail");
    // Business name problems.
    expect(nameProblems("Sharma!!! Electricals")).toContain("uses symbols");
    expect(nameProblems("A".repeat(30) + " " + "b".repeat(31))).toContain("is very long");
    expect(nameProblems("TV")).toEqual([]);
    // Details.
    expect(by({ serviceAreas: 1 }).service_areas).toMatchObject({ status: "warn", earned: 2 });
    expect(by({ addressLine: "12 Hill Cart Road" }).address).toMatchObject({ status: "warn", message: "No PIN code" });
    expect(by({ pincode: "734001" }).address).toMatchObject({ status: "warn", message: "No street address" });
    expect(by({ services: 0 }).service_prices.status).toBe("fail");
    expect(analyzeSeo({ ...base, status: "suspended" }).notIndexedReason).toBe("The listing is not live, so search engines cannot see it.");
    expect(pageDescription({ ...base, totalReviews: 1, avgRating: 5 })).toContain("Rated 5.0/5 from 1 review.");
  });
});

