import type { Entitlement } from "@/types/billing";

/** What each plan-gated feature is called in upgrade prompts, and the entitlement that unlocks it. */
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

export const planFor = (entitlement: Entitlement): "Pro" | "Business" => (entitlement === "provider_business" ? "Business" : "Pro");

export const SOURCE_LABEL = {
  admin: "Set up by the DialNFind team",
  razorpay: "Paid on the DialNFind website",
  app_store: "Billed through the App Store",
  play_store: "Billed through Google Play",
} as const;
