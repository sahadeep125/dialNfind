import { prisma } from "../lib/prisma.js";

export type FieldType = "text" | "number" | "boolean" | "email" | "url" | "select" | "textarea";

export interface SettingField {
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  options?: string[];
  min?: number;
  max?: number;
  default?: string;
}

export interface SettingGroup {
  key: string;
  title: string;
  description: string;
  fields: SettingField[];
}

/** Platform settings the admin app can edit. Keys are stored as-is in the settings table. */
export const SETTING_GROUPS: SettingGroup[] = [
  {
    key: "general",
    title: "General",
    description: "Contact details shown to customers and providers across the apps.",
    fields: [
      { key: "site_name", label: "Platform name", type: "text", default: "DialNFind" },
      { key: "support_email", label: "Support email", type: "email" },
      { key: "support_phone", label: "Support phone", type: "text", help: "Shown on the contact page, e.g. +918001234567" },
      { key: "support_hours", label: "Support hours", type: "text", default: "Mon to Sat, 9 AM to 7 PM" },
    ],
  },
  {
    key: "search",
    title: "Search and listings",
    description: "How providers are found and approved.",
    fields: [
      { key: "default_search_radius_km", label: "Default search radius (km)", type: "number", min: 1, max: 100, default: "15" },
      { key: "auto_approve_listings", label: "Publish new listings without review", type: "boolean", help: "When off, new listings wait in Providers until approved. If never set, listings go live in development and wait for review in production." },
      { key: "min_review_length", label: "Minimum review length", type: "number", min: 0, max: 500, default: "10" },
    ],
  },
  {
    key: "monetisation",
    title: "Promotions",
    description: "What sponsored campaigns cost providers.",
    fields: [
      { key: "sponsored_cpc", label: "Promotion cost per contact (Rs)", type: "number", min: 1, max: 1000, default: "5" },
      { key: "sponsored_min_budget", label: "Minimum promotion budget (Rs)", type: "number", min: 0, max: 1000000, default: "500" },
    ],
  },
  {
    key: "legal",
    title: "Legal links",
    description: "Linked from the footer and sign-up forms.",
    fields: [
      { key: "terms_url", label: "Terms of use link", type: "url" },
      { key: "privacy_url", label: "Privacy policy link", type: "url" },
    ],
  },
];

/** Every editable key with its field definition. */
export const SETTING_FIELDS = new Map<string, SettingField>(SETTING_GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f] as const)));

const CACHE_MS = 60_000;
const cache = new Map<string, { value: string | null; at: number }>();

/** A setting's value, or its default. Cached for a minute because search reads it on every request. */
export async function getSetting(key: string): Promise<string | null> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const row = await prisma.setting.findUnique({ where: { key } });
  const value = row?.value ?? SETTING_FIELDS.get(key)?.default ?? null;
  cache.set(key, { value, at: Date.now() });
  return value;
}

/** A numeric setting, or the fallback when it is unset or not a number. */
export async function getNumberSetting(key: string, fallback: number): Promise<number> {
  const raw = await getSetting(key);
  const n = Number(raw);
  return raw !== null && raw !== "" && Number.isFinite(n) ? n : fallback;
}

/** Called after the admin saves settings so the new values apply straight away. */
export function clearSettingsCache() {
  cache.clear();
}
