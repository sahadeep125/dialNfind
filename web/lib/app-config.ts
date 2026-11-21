import "server-only";
import { cache } from "react";
import { publicApi } from "./api";
import { BUSINESS } from "./config";

/** Public settings from the admin console (GET /app-config). Unset ones are null. */
export interface AppConfig {
  site_name: string;
  support_email: string | null;
  support_phone: string | null;
  support_hours: string | null;
  terms_url: string | null;
  privacy_url: string | null;
  min_review_length: number;
}

const FALLBACK: AppConfig = {
  site_name: "KaajVa",
  support_email: BUSINESS.supportEmail,
  support_phone: BUSINESS.phone,
  support_hours: null,
  terms_url: null,
  privacy_url: null,
  min_review_length: 10,
};

/** Cached for ten minutes; a page still renders if the API is briefly down. */
export const getAppConfig = cache(async (): Promise<AppConfig> => {
  try {
    const { config } = await publicApi<{ config: Partial<AppConfig> }>("/app-config", { revalidate: 600, tags: ["app-config"] });
    // A setting the team has not filled in comes back null; keep the KaajVa default for it.
    const set = Object.fromEntries(Object.entries(config).filter(([, v]) => v !== null && v !== ""));
    return { ...FALLBACK, ...set };
  } catch {
    return FALLBACK;
  }
});
