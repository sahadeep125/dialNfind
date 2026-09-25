import { prisma } from "../lib/prisma.js";

export type FieldType = "text" | "number" | "boolean" | "secret" | "email" | "url" | "select" | "textarea";

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

export interface Plugin {
  key: string;
  name: string;
  category: "Payments" | "Messaging" | "Sign-in" | "Email" | "Notifications" | "Analytics";
  description: string;
  docsUrl: string;
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
      { key: "company_address", label: "Registered address", type: "textarea" },
      { key: "gstin", label: "GSTIN", type: "text", help: "Printed on invoices" },
    ],
  },
  {
    key: "search",
    title: "Search and listings",
    description: "How providers are found and approved.",
    fields: [
      { key: "default_search_radius_km", label: "Default search radius (km)", type: "number", min: 1, max: 100 },
      { key: "auto_approve_listings", label: "Publish new listings without review", type: "boolean", help: "When off, new listings wait in Providers until approved. If never set, listings go live in development and wait for review in production." },
      { key: "min_review_length", label: "Minimum review length", type: "number", min: 0, max: 500, default: "10" },
    ],
  },
  {
    key: "monetisation",
    title: "Pricing and promotions",
    description: "Fees charged to providers.",
    fields: [
      { key: "lead_fee_amount", label: "Lead fee (Rs)", type: "number", min: 0, max: 10000 },
      { key: "sponsored_cpc", label: "Promotion cost per contact (Rs)", type: "number", min: 1, max: 1000 },
      { key: "sponsored_min_budget", label: "Minimum promotion budget (Rs)", type: "number", min: 0, max: 1000000 },
      { key: "gst_percent", label: "GST on invoices (%)", type: "number", min: 0, max: 28, default: "18" },
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

const enabled = (name: string): SettingField => ({ key: "enabled", label: `Use ${name}`, type: "boolean" });

/** Third-party integrations. Stored as plugin.<key>.<field>; secret values are never sent back to the browser. */
export const PLUGINS: Plugin[] = [
  {
    key: "razorpay",
    name: "Razorpay",
    category: "Payments",
    description: "Collect plan and promotion payments by UPI, card and net banking.",
    docsUrl: "https://razorpay.com/docs/api/",
    fields: [enabled("Razorpay"), { key: "key_id", label: "Key ID", type: "text" }, { key: "key_secret", label: "Key secret", type: "secret" }, { key: "webhook_secret", label: "Webhook secret", type: "secret" }],
  },
  {
    key: "msg91",
    name: "MSG91",
    category: "Messaging",
    description: "Send SMS codes for listing claims and phone verification.",
    docsUrl: "https://docs.msg91.com/",
    fields: [enabled("MSG91"), { key: "auth_key", label: "Auth key", type: "secret" }, { key: "sender_id", label: "Sender ID", type: "text" }, { key: "otp_template_id", label: "OTP template ID", type: "text" }],
  },
  {
    key: "whatsapp",
    name: "WhatsApp Business",
    category: "Messaging",
    description: "Send lead alerts to providers on WhatsApp through the Cloud API.",
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    fields: [enabled("WhatsApp"), { key: "phone_number_id", label: "Phone number ID", type: "text" }, { key: "access_token", label: "Access token", type: "secret" }],
  },
  {
    key: "google_oauth",
    name: "Sign in with Google",
    category: "Sign-in",
    description: "Let customers and providers sign in with their Google account.",
    docsUrl: "https://developers.google.com/identity/gsi/web",
    fields: [enabled("Google sign-in"), { key: "client_id", label: "Client ID", type: "text" }, { key: "client_secret", label: "Client secret", type: "secret" }],
  },
  {
    key: "apple_oauth",
    name: "Sign in with Apple",
    category: "Sign-in",
    description: "Required for the iOS app when other social sign-in options are offered.",
    docsUrl: "https://developer.apple.com/sign-in-with-apple/",
    fields: [enabled("Apple sign-in"), { key: "client_id", label: "Services ID", type: "text" }, { key: "team_id", label: "Team ID", type: "text" }, { key: "key_id", label: "Key ID", type: "text" }, { key: "private_key", label: "Private key", type: "secret" }],
  },
  {
    key: "smtp",
    name: "Email (SMTP)",
    category: "Email",
    description: "Send password resets, receipts and support replies by email.",
    docsUrl: "https://nodemailer.com/smtp/",
    fields: [
      enabled("email"),
      { key: "host", label: "SMTP host", type: "text" },
      { key: "port", label: "Port", type: "number", min: 1, max: 65535, default: "587" },
      { key: "username", label: "Username", type: "text" },
      { key: "password", label: "Password", type: "secret" },
      { key: "from_email", label: "From address", type: "email" },
    ],
  },
  {
    key: "fcm",
    name: "Firebase Cloud Messaging",
    category: "Notifications",
    description: "Push notifications to the Android and iOS apps.",
    docsUrl: "https://firebase.google.com/docs/cloud-messaging",
    fields: [enabled("push notifications"), { key: "project_id", label: "Project ID", type: "text" }, { key: "service_account", label: "Service account JSON", type: "secret" }],
  },
  {
    key: "google_analytics",
    name: "Google Analytics",
    category: "Analytics",
    description: "Page and event analytics for the customer website.",
    docsUrl: "https://developers.google.com/analytics",
    fields: [enabled("Google Analytics"), { key: "measurement_id", label: "Measurement ID", type: "text", help: "Starts with G-" }],
  },
];

export const pluginKey = (plugin: string, field: string) => `plugin.${plugin}.${field}`;

/** Every editable key with its field definition. */
export const SETTING_FIELDS = new Map<string, SettingField>([
  ...SETTING_GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f] as const)),
  ...PLUGINS.flatMap((p) => p.fields.map((f) => [pluginKey(p.key, f.key), f] as const)),
]);

export function maskSecret(value: string) {
  return value.length <= 4 ? "••••" : `••••${value.slice(-4)}`;
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? SETTING_FIELDS.get(key)?.default ?? null;
}

/** An integration counts as on when its enabled flag is set and every secret it needs is filled. */
export async function pluginEnabled(plugin: string): Promise<boolean> {
  const def = PLUGINS.find((p) => p.key === plugin);
  if (!def) return false;
  const rows = await prisma.setting.findMany({ where: { key: { startsWith: `plugin.${plugin}.` } } });
  const values = new Map(rows.map((r) => [r.key, r.value]));
  if (values.get(pluginKey(plugin, "enabled")) !== "true") return false;
  return def.fields.filter((f) => f.type === "secret").every((f) => !!values.get(pluginKey(plugin, f.key)));
}
