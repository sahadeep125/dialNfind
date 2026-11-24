import { vi } from "vitest";
import { act, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { App } from "@/App";

export const API = "http://api.test/api/v1";

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

type Handler = (url: URL, init: RequestInit | undefined) => Response | Promise<Response> | undefined;

/** Routes fetch by "METHOD /path" or "/path" (any method), without the API prefix and ignoring the query. */
export function mockApi(routes: Record<string, unknown>) {
  const fn = vi.fn(async (input: unknown, init?: RequestInit) => {
    const raw = input instanceof Request ? input.url : String(input);
    const url = new URL(raw, "http://localhost");
    const method = (init?.method ?? "GET").toUpperCase();
    const path = url.pathname.replace(/^\/api\/v1/, "");
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

/** The JSON body of the last call with a body to a path. */
export function lastBody(fetch: ReturnType<typeof mockApi>, pathPart: string) {
  const call = [...fetch.mock.calls].reverse().find(([u, init]) => String(u).includes(pathPart) && init?.body !== undefined);
  return call ? JSON.parse(String(call[1]?.body)) : undefined;
}

export const user = (over: Record<string, unknown> = {}) => ({
  id: 7,
  role: "provider",
  name: "Ravi Kumar",
  email: "ravi@example.com",
  phone: "+919876543210",
  emailVerifiedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  provider: { id: 3, slug: "sharma-tv", businessName: "Sharma TV Repair", status: "active" },
  hasPassword: true,
  linkedAccounts: [],
  ...over,
});

export const providerMe = (over: Record<string, unknown> = {}) => ({
  provider: { id: 3, slug: "sharma-tv", businessName: "Sharma TV Repair", status: "active", profileCompletenessPct: 60, verificationStatus: "partial" },
  claims: [],
  ...over,
});

/** The API answers for a signed-in provider with a live business. */
export const signedIn = (u: Record<string, unknown> = {}, me: Record<string, unknown> = {}) => {
  localStorage.setItem("kjv_provider_token", "tok");
  return { "/auth/me": { user: user(u) }, "/provider/me": providerMe(me), "/app-config": { config: { support_email: "help@x.co", support_phone: null, terms_url: null, privacy_url: null } } };
};

/** An SEO report as the API sends it (server/src/services/seo.ts analyzeSeo). */
export const seoAnalysis = (over: Record<string, unknown> = {}) => ({
  score: 62,
  grade: "fair",
  title: "Sharma TV Repair: TV Repair in Mumbai | KaajVa",
  description: "Sharma TV Repair: TV Repair in Mumbai (Andheri). We fix TVs and more across the city, quickly and well. Call directly on KaajVa, no booking fee.",
  titleSource: "automatic",
  descriptionSource: "automatic",
  service: "TV Repair",
  focusKeyword: "tv repair in Mumbai",
  focusKeywordSource: "automatic",
  keywords: ["tv repair in Mumbai", "tv repair near me", "Sharma TV Repair Mumbai"],
  indexable: true,
  notIndexedReason: null,
  checks: [
    { key: "title_length", category: "search", label: "Page title length", status: "pass", weight: 8, earned: 8, message: "47 characters (automatic title)", suggestion: null },
    { key: "description_length", category: "content", label: "Business description", status: "fail", weight: 10, earned: 2, message: "10 words", suggestion: "Write at least 80 words." },
    { key: "logo", category: "media", label: "Logo or profile photo", status: "fail", weight: 4, earned: 0, message: "Missing", suggestion: "Upload your logo." },
    { key: "service_areas", category: "details", label: "Service areas", status: "warn", weight: 3, earned: 2, message: "1 area", suggestion: "List the areas you serve." },
  ],
  suggestions: [
    { key: "description_length", text: "Write at least 80 words.", points: 8 },
    { key: "logo", text: "Upload your logo.", points: 4 },
    { key: "service_areas", text: "List the areas you serve.", points: 1 },
  ],
  counts: { titleLength: 47, descriptionLength: 140, descriptionWords: 10, keywordDensity: 0, photos: 0, photosWithAltText: 0 },
  ...over,
});

export const profile = (over: Record<string, unknown> = {}) => ({
  id: 3,
  slug: "sharma-tv",
  businessName: "Sharma TV Repair",
  description: "We fix TVs and more across the city, quickly and well.",
  businessType: "individual",
  yearsExperience: 5,
  selfReportedCompletedJobs: 100,
  phone: "+919876543210",
  whatsappNumber: null,
  email: "shop@example.com",
  website: null,
  logoUrl: null,
  coverUrl: null,
  addressLine: "1 Main Road",
  locality: "Andheri",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400053",
  latitude: 19.1,
  longitude: 72.8,
  serviceRadiusKm: 10,
  acceptsCalls: true,
  acceptsWhatsapp: true,
  isAvailable: true,
  avgRating: 4.5,
  totalReviews: 8,
  verificationStatus: "partial",
  status: "active",
  profileCompletenessPct: 60,
  businessHours: [{ dayOfWeek: 1, openTime: "09:00", closeTime: "18:00", is24x7: false }],
  serviceAreas: [{ areaName: "Andheri", pincode: "400053", latitude: 19.1, longitude: 72.8 }],
  services: [{ id: 1, categoryId: 1, subcategoryId: 11, startingPrice: 300, priceUnit: "per_visit", isPrimary: true, category: { id: 1, name: "Electronics Repair" }, subcategory: { id: 11, name: "TV Repair" } }],
  portfolio: [],
  badges: [],
  checklist: [
    { key: "logo", label: "Upload a logo", done: false },
    { key: "hours", label: "Set your working hours", done: true },
  ],
  seoTitle: null,
  seoDescription: null,
  focusKeyword: null,
  seoKeywords: [],
  updatedAt: "2026-11-01T00:00:00.000Z",
  seo: seoAnalysis(),
  ...over,
});

export const categories = [
  { id: 1, name: "Electronics Repair", slug: "electronics-repair", description: null, subcategories: [{ id: 11, categoryId: 1, name: "TV Repair", slug: "tv-repair" }, { id: 12, categoryId: 1, name: "AC Repair", slug: "ac-repair" }] },
  { id: 2, name: "Plumbing", slug: "plumbing", description: null, subcategories: [] },
];

/** Shows the current path, so tests can assert on navigation. */
function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.search}</div>;
}

export function newQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } } });
}

/** The whole app (auth, routes, layouts) at `path`. */
export async function renderApp(path: string) {
  const qc = newQueryClient();
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[path]}>
          <AuthProvider>
            <App />
            <Where />
            <Toaster />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
  return { ...view, qc };
}

/** One element with the router, query client and auth around it (for components). */
export function renderWith(ui: React.ReactElement, path = "/") {
  const qc = newQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Routes>
            <Route path="*" element={ui} />
          </Routes>
          <Where />
          <Toaster />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/**
 * Fake XMLHttpRequest for uploads: each upload reports 50% progress, then answers with `answer(purpose)`
 * (a URL by default, or "throw" to fail at send). Images always decode as 1000 x 1000.
 */
export function stubUploads(answer: (purpose: string) => { status: number; body: unknown } | "throw" = (p) => ({ status: 201, body: { url: `http://cdn.test/${p}.png` } })) {
  const sent: string[] = [];
  class FakeXhr {
    upload: { onprogress?: (e: unknown) => void } = {};
    status = 0;
    responseText = "";
    onload?: () => void;
    onerror?: () => void;
    url = "";
    open(_method: string, url: string) {
      this.url = url;
    }
    setRequestHeader() {}
    send() {
      const purpose = new URL(this.url).searchParams.get("purpose")!;
      sent.push(purpose);
      const a = answer(purpose);
      // Something that is not an Error, as a broken browser API might throw.
      if (a === "throw") throw "offline";
      setTimeout(() => this.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 2 }), 5);
      setTimeout(() => {
        this.status = a.status;
        this.responseText = JSON.stringify(a.body);
        this.onload?.();
      }, 200);
    }
  }
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 1000, height: 1000, close() {} })));
  return sent;
}

export const pngFile = (name = "photo.png") => new File([new Uint8Array(100)], name, { type: "image/png" });
export const pdfFile = (name = "doc.pdf") => new File([new Uint8Array(100)], name, { type: "application/pdf" });

/** Sets navigator.geolocation; pass null to remove it. */
export function stubGeolocation(result: { lat: number; lng: number } | "error" | null) {
  const geolocation =
    result === null
      ? undefined
      : {
          getCurrentPosition: (ok: (p: unknown) => void, fail: () => void) =>
            result === "error" ? fail() : ok({ coords: { latitude: result.lat, longitude: result.lng } }),
        };
  Object.defineProperty(navigator, "geolocation", { value: geolocation, configurable: true });
}

/** Picks an option in a Radix Select by opening its trigger. */
export async function pickOption(trigger: HTMLElement, name: string | RegExp) {
  const { default: userEvent } = await import("@testing-library/user-event");
  const { screen } = await import("@testing-library/react");
  await userEvent.click(trigger);
  await userEvent.click(await screen.findByRole("option", { name }));
}

/** Routes every page inside the app layout needs: the session, the profile (availability) and notifications. */
export const inApp = (u: Record<string, unknown> = {}, me: Record<string, unknown> = {}) => ({
  ...signedIn(u, me),
  "/provider/profile": { provider: profile() },
  "/me/notifications": { notifications: [], unread: 0 },
});
