export const API_URL = process.env.API_URL ?? "http://localhost:4000/api/v1";
export const PROVIDER_APP_URL = process.env.NEXT_PUBLIC_PROVIDER_APP_URL ?? "http://localhost:5173";
export const TOKEN_COOKIE = "dnf_token";
export const LOCATION_COOKIE = "dnf_location";
export const SITE_NAME = "DialNFind";
export const SUPPORT_EMAIL = "support@dialnfind.com";
export const SUPPORT_PHONE = "+918001234567";
/**
 * Map tiles and the credit their licence requires. OpenStreetMap's own tile servers are for light use;
 * set these to a hosted tile service (MapTiler, Stadia, Carto...) before heavy production traffic.
 */
export const MAP_TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const MAP_ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
