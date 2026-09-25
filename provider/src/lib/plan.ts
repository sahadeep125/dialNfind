import { useAuth } from "./auth";
import type { Entitlement, PlanState } from "./types";

const FREE: PlanState = {
  plan: { id: null, code: "free", name: "Free" },
  entitlements: [],
  features: { analytics: false, whatsapp: false, promote: false, priority_support: false },
  subscription: null,
  limits: { leads: { limit: null, used: 0 }, photos: { limit: null, used: 0 } },
};

/** The signed-in provider's plan. Everything that is shown or hidden by plan reads it from here. */
export function usePlan(): PlanState {
  return useAuth().providerState?.plan ?? FREE;
}

export function useEntitlement(entitlement: Entitlement): boolean {
  return usePlan().entitlements.includes(entitlement);
}

/** The plan that unlocks an entitlement, for upgrade prompts. */
export const planFor = (entitlement: Entitlement) => (entitlement === "provider_business" ? "Business" : "Pro");

/** What each gated feature is called in upgrade prompts. */
export const FEATURE_COPY: Record<string, { title: string; text: string; entitlement: Entitlement }> = {
  analytics: {
    title: "See who is looking at your business",
    text: "Pro shows profile views, search impressions, your view-to-lead rate and where you rank in your city.",
    entitlement: "provider_pro",
  },
  leads: {
    title: "Unlock every lead",
    text: "You have used this month's free leads. Pro shows every customer who contacts you, with no monthly limit.",
    entitlement: "provider_pro",
  },
  photos: {
    title: "Show more of your work",
    text: "Free listings show 3 photos. Pro shows 30 and Business has no limit.",
    entitlement: "provider_pro",
  },
  whatsapp: {
    title: "Let customers WhatsApp you",
    text: "Pro adds a WhatsApp button to your profile, so customers can message you as well as call.",
    entitlement: "provider_pro",
  },
  promote: {
    title: "Promote your listing",
    text: "Business puts you at the top of search in your categories with sponsored campaigns.",
    entitlement: "provider_business",
  },
};
