export const API_URL = process.env.API_URL ?? "http://localhost:4000/api/v1";
export const PROVIDER_APP_URL = process.env.NEXT_PUBLIC_PROVIDER_APP_URL ?? "http://localhost:5173";
export const TOKEN_COOKIE = "dnf_token";
export const LOCATION_COOKIE = "dnf_location";
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
/** Office shown on the contact page and footer; set the env vars to override. */
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
