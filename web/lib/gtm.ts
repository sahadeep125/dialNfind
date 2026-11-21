/**
 * Google Tag Manager, for Google Analytics 4 and ad conversions. Off unless NEXT_PUBLIC_GTM_ID is set.
 * PostHog keeps the full event list; GTM gets a short list under GA4 names, mapped from the same track()
 * calls so both tools count the same moments. The list and the key events are in docs/ANALYTICS.md.
 */
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "";

/** Every parameter the GTM container reads. Each push clears the others, so one event's values never leak into the next. */
const GTM_PARAMS = [
  "search_term", "city", "category", "subcategory", "provider_id", "is_claimed", "channel", "contact_source",
  "method", "rating", "listing_type", "value", "currency", "item_category", "item_name",
] as const;

type GtmParams = Partial<Record<(typeof GTM_PARAMS)[number], unknown>>;
type DataLayerWindow = Window & { dataLayer?: Record<string, unknown>[] };

/** The GA4 event for a PostHog event, or null when GA4 does not need it. Never includes phone numbers, names or emails. */
export function toGtmEvent(event: string, p: Record<string, unknown> = {}): { event: string; params: GtmParams } | null {
  switch (event) {
    case "search_submitted":
      return { event: "search", params: { search_term: p.query, city: p.city } };
    case "category_viewed":
      return { event: "view_category", params: { category: p.category, subcategory: p.subcategory } };
    case "provider_viewed":
      return { event: "view_provider", params: { provider_id: p.provider_id, category: p.category, is_claimed: p.is_claimed } };
    case "contact_clicked":
      return { event: "contact_provider", params: { channel: p.channel, provider_id: p.provider_id, category: p.category, contact_source: p.source } };
    case "phone_number_revealed":
      return { event: "contact_provider", params: { channel: "reveal", provider_id: p.provider_id, contact_source: p.source } };
    case "signed_up":
      return { event: p.role === "provider" ? "provider_sign_up" : "sign_up", params: { method: p.method } };
    case "review_submitted":
      return { event: "submit_review", params: { provider_id: p.provider_id, rating: p.rating } };
    default:
      return null;
  }
}

export function pushGtmEvent(event: string, properties?: Record<string, unknown>): void {
  if (!GTM_ID || typeof window === "undefined") return;
  const mapped = toGtmEvent(event, properties);
  if (!mapped) return;
  const w = window as DataLayerWindow;
  w.dataLayer = w.dataLayer ?? [];
  const cleared = Object.fromEntries(GTM_PARAMS.map((k) => [k, undefined]));
  // null reads as "(not set)" in GA4 only when the value is left out.
  const params = Object.fromEntries(Object.entries(mapped.params).map(([k, v]) => [k, v ?? undefined]));
  w.dataLayer.push({ ...cleared, ...params, event: mapped.event });
}

/** Called once from instrumentation-client.ts. GA4 page views, including client-side navigation, come from the container. */
export function loadGtm(): void {
  if (!GTM_ID || typeof document === "undefined") return;
  const w = window as DataLayerWindow;
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
  document.head.appendChild(script);
}
