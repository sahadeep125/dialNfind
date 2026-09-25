export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";
export const WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";
/** Map tiles and the credit their licence requires; point at a hosted tile service for heavy use. */
export const MAP_TILE_URL = import.meta.env.VITE_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const MAP_ATTRIBUTION = import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
