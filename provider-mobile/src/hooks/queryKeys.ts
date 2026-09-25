/**
 * Query keys shared across screens. Feature hooks keep their own keys next to them; the first
 * element of every key is unique so invalidating by prefix never hits another feature.
 */
export const queryKeys = {
  session: (token: string | null) => ["session", token] as const,
  profile: ["profile"] as const,
  categories: ["categories"] as const,
  locations: (q: string) => ["locations", q] as const,
  appConfig: ["app-config"] as const,
};
