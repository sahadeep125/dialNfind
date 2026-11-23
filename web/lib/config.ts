export const API_URL = process.env.API_URL ?? "http://localhost:4000/api/v1";
export const PROVIDER_APP_URL = process.env.NEXT_PUBLIC_PROVIDER_APP_URL ?? "http://localhost:5173";
export const TOKEN_COOKIE = "kjv_token";
export const LOCATION_COOKIE = "kjv_location";
export const SITE_NAME = "KaajVa";
/** Public address of this website: canonical links, the sitemap and social previews use it. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://kaajva.in").replace(/\/$/, "");
/**
 * The business behind the site: name, address and phone (NAP). Search engines compare these with the
 * Google Business Profile and other listings, so keep them word-for-word identical everywhere.
 */
export const BUSINESS = {
  name: SITE_NAME,
  domain: "kaajva.in",
  infoEmail: "info@kaajva.in",
  supportEmail: "support@kaajva.in",
  /** E.164, as structured data wants it. */
  phone: "+918906609532",
  address: {
    streetAddress: "Ghogomali",
    addressLocality: "Siliguri",
    addressRegion: "West Bengal",
    postalCode: "734006",
    addressCountry: "IN",
  },
  /** The cities and districts the directory covers, for areaServed. */
  areaServed: ["Siliguri", "Jalpaiguri", "Darjeeling", "Matigara", "Bagdogra", "West Bengal"],
} as const;
/**
 * KaajVa's own profiles elsewhere: shown in the footer and listed as sameAs in the Organization JSON-LD, which
 * tells search engines and AI assistants these accounts belong to this business. NEXT_PUBLIC_SOCIAL_LINKS
 * (comma separated) adds more, such as the Google Business Profile link once it is verified.
 */
export const OFFICIAL_SOCIAL_LINKS = [
  { label: "Facebook", url: "https://www.facebook.com/kaajva" },
  { label: "Instagram", url: "https://www.instagram.com/kaajvaofficial/" },
  { label: "YouTube", url: "https://www.youtube.com/@kaajva" },
  { label: "X", url: "https://x.com/kaajvaofficial" },
] as const;
const EXTRA_SOCIAL_LINKS = (process.env.NEXT_PUBLIC_SOCIAL_LINKS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => /^https?:\/\//.test(s));
/** Every profile URL, official ones first, without duplicates. */
export const SOCIAL_LINKS: string[] = [...new Set([...OFFICIAL_SOCIAL_LINKS.map((l) => l.url), ...EXTRA_SOCIAL_LINKS])];
/** Fallback office address while the admin setting (Settings > General > Office address) cannot be loaded. */
export const OFFICE_ADDRESS = process.env.NEXT_PUBLIC_OFFICE_ADDRESS || "Ghogomali, Siliguri, West Bengal, India 734006";
export const OFFICE_REGION = process.env.NEXT_PUBLIC_OFFICE_REGION || "Siliguri, West Bengal";
/**
 * Map tiles and the credit their licence requires. OpenStreetMap's own tile servers are for light use;
 * set these to a hosted tile service (MapTiler, Stadia, Carto...) before heavy production traffic.
 */
export const MAP_TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const MAP_ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
/** Sign in with Google / Apple. A button only shows when its IDs are set (see docs/social-login.md). */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
export const APPLE_SERVICES_ID = process.env.NEXT_PUBLIC_APPLE_SERVICES_ID ?? "";
/** Must be listed as a Return URL on the Services ID; Apple does not accept localhost. */
export const APPLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI ?? "";
/** Store listings for the "Get the app" banner; a badge only shows when its URL is set. */
export const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? "";
export const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL ?? "";
