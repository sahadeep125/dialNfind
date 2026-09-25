/**
 * Plans and what they unlock. Apps never check plan names: they ask whether the provider has an
 * entitlement, the same identifiers RevenueCat uses, so web and store purchases unlock the same things.
 */

export const ENTITLEMENTS = ["provider_pro", "provider_business"] as const;
export type Entitlement = (typeof ENTITLEMENTS)[number];

export const PLAN_CODES = ["free", "pro", "business"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

/** Entitlements each plan grants. Business includes everything in Pro. Unknown codes grant nothing. */
export const PLAN_ENTITLEMENTS: Record<string, Entitlement[]> = {
  free: [],
  pro: ["provider_pro"],
  business: ["provider_pro", "provider_business"],
};

export const entitlementsFor = (code: string | null | undefined): Entitlement[] => PLAN_ENTITLEMENTS[code ?? "free"] ?? [];

/** Features behind an entitlement. Numeric limits (leads, photos) live on the plan row instead. */
export const FEATURES = {
  analytics: { entitlement: "provider_pro", label: "Profile analytics" },
  whatsapp: { entitlement: "provider_pro", label: "WhatsApp button on your profile" },
  promote: { entitlement: "provider_business", label: "Sponsored campaigns" },
  priority_support: { entitlement: "provider_business", label: "Priority support" },
} as const satisfies Record<string, { entitlement: Entitlement; label: string }>;
export type Feature = keyof typeof FEATURES;

/** The plan a set of store entitlements corresponds to, highest first. */
export function planCodeForEntitlements(active: readonly string[]): PlanCode {
  if (active.includes("provider_business")) return "business";
  if (active.includes("provider_pro")) return "pro";
  return "free";
}

/** How long a plan keeps working after a renewal payment fails. */
export const GRACE_DAYS = 3;

/** Public tier shown to customers next to a provider, or null for free listings. */
export const planTier = (code: string | null | undefined): "pro" | "business" | null =>
  code === "pro" || code === "business" ? code : null;
