import { vi } from "vitest";
import type { ReactElement } from "react";

export const API = "http://api.test/api/v1";

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

type Handler = (url: URL, init: RequestInit | undefined) => Response | Promise<Response> | undefined;

/**
 * Routes fetch by path. `routes` maps "METHOD /path" or "/path" (any method) to a body, a Response or a
 * handler; paths are matched without the API prefix or the /api/proxy prefix, ignoring the query.
 */
export function mockApi(routes: Record<string, unknown | Handler>) {
  const fn = vi.fn(async (input: unknown, init?: RequestInit) => {
    const raw = input instanceof Request ? input.url : String(input);
    const url = new URL(raw, "http://localhost");
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const path = url.pathname.replace(/^\/api\/v1/, "").replace(/^\/api\/proxy/, "");
    for (const key of [`${method} ${path}`, path]) {
      if (key in routes) {
        const value = routes[key];
        if (typeof value === "function") {
          const r = await (value as Handler)(url, init);
          if (r) return r.clone();
          continue;
        }
        return value instanceof Response ? value.clone() : json(value);
      }
    }
    throw new Error(`Unmocked fetch: ${method} ${raw}`);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

/** Awaits an async server component and returns its element, ready for render(). */
export async function serverElement<P>(Component: (props: P) => Promise<ReactElement | null> | ReactElement | null, props: P) {
  return (await Component(props)) as ReactElement;
}

export const sp = (o: Record<string, string | string[] | undefined> = {}) => Promise.resolve(o);
export const params = <T,>(o: T) => Promise.resolve(o);

export const provider = (over: Record<string, unknown> = {}) => ({
  id: 1,
  slug: "sharma-tv",
  businessName: "Sharma TV Repair",
  shortDescription: "TV and appliance repair",
  logoUrl: null,
  coverUrl: null,
  businessType: "individual",
  yearsExperience: 5,
  phone: "+919876543210",
  whatsappNumber: "+919876543210",
  acceptsCalls: true,
  acceptsWhatsapp: true,
  isAvailable: true,
  locality: "Andheri",
  city: "Mumbai",
  state: "Maharashtra",
  latitude: 19.1,
  longitude: 72.8,
  distanceKm: 1.2,
  avgRating: 4.5,
  totalReviews: 12,
  verificationStatus: "verified",
  isClaimed: true,
  isOpenNow: true,
  todayHours: "9 AM - 6 PM",
  primaryCategory: { id: 1, name: "Electronics Repair", slug: "electronics-repair" },
  subcategories: ["TV Repair"],
  startingPrice: 300,
  priceUnit: "per_visit",
  serviceAreas: ["Andheri"],
  badges: [{ id: 1, name: "Top Rated" }],
  isFavorite: false,
  isSponsored: false,
  planTier: null,
  ...over,
});

export const user = (over: Record<string, unknown> = {}) => ({
  id: 7,
  role: "customer",
  name: "Asha Rao",
  email: "asha@example.com",
  phone: null,
  profilePhotoUrl: null,
  emailVerifiedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  provider: null,
  hasPassword: true,
  linkedAccounts: [],
  ...over,
});
