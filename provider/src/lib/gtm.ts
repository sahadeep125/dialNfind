/**
 * Google Tag Manager, for Google Analytics 4 and ad conversions. Off unless VITE_GTM_ID is set.
 * The same container as the website (kaajva.in); PostHog keeps the full event list, GTM gets the provider
 * sign-up, listing and purchase moments under GA4 names. The list and the key events are in docs/ANALYTICS.md.
 */
const GTM_ID: string = import.meta.env.VITE_GTM_ID ?? "";

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
    case "signed_up":
      return { event: p.role === "customer" ? "sign_up" : "provider_sign_up", params: { method: p.method } };
    case "onboarding_completed":
      return { event: "listing_complete", params: { listing_type: "new" } };
    case "claim_submitted":
      return { event: "listing_complete", params: { listing_type: "claim", provider_id: p.provider_id } };
    case "subscription_purchased":
      return { event: "purchase", params: { value: p.amount, currency: "INR", item_category: "plan", item_name: p.plan } };
    case "promotion_purchased":
      return { event: "purchase", params: { value: p.amount, currency: "INR", item_category: "promotion", item_name: "promotion" } };
    default:
      return null;
  }
}

export function pushGtmEvent(event: string, properties?: Record<string, unknown>): void {
  if (!GTM_ID) return;
  const mapped = toGtmEvent(event, properties);
  if (!mapped) return;
  const w = window as DataLayerWindow;
  w.dataLayer = w.dataLayer ?? [];
  const cleared = Object.fromEntries(GTM_PARAMS.map((k) => [k, undefined]));
  // null reads as "(not set)" in GA4 only when the value is left out.
  const params = Object.fromEntries(Object.entries(mapped.params).map(([k, v]) => [k, v ?? undefined]));
  w.dataLayer.push({ ...cleared, ...params, event: mapped.event });
}

/** Loads the container once, at start-up. GA4 page views, including in-app navigation, come from the container. */
export function loadGtm(): void {
  if (!GTM_ID) return;
  const w = window as DataLayerWindow;
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
  document.head.appendChild(script);
}
