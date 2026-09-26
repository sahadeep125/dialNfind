import "server-only";
import { cache } from "react";
import { publicApi } from "./api";

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
  site_name: "DialNFind",
  support_email: null,
  support_phone: null,
  support_hours: null,
  terms_url: null,
  privacy_url: null,
  min_review_length: 10,
};

/** Cached for ten minutes; a page still renders if the API is briefly down. */
export const getAppConfig = cache(async (): Promise<AppConfig> => {
  try {
    const { config } = await publicApi<{ config: Partial<AppConfig> }>("/app-config", { revalidate: 600, tags: ["app-config"] });
    return { ...FALLBACK, ...config };
  } catch {
    return FALLBACK;
  }
});
