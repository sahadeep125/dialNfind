/* Production bootstrap: the reference data the API needs, one super admin, and the real provider listings in
 * prisma/data/providers-*.json. No demo users, reviews or leads. Safe to run on every deploy: it only adds what
 * is missing and never changes rows the team has since edited in the admin console (plan prices, settings,
 * categories, listings).
 *
 * Run with `pnpm --filter server db:bootstrap` (deploys run it through `pnpm release`). The first run needs
 * BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD to create the first super admin; later runs skip that step.
 * Set BOOTSTRAP_IMPORT_PROVIDERS=false to skip the provider import. */
import { readFileSync } from "node:fs";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";
import { recalculateCategoryCounts } from "../src/services/ranking.js";
import { DATA_DIR, describe, importProviderBundles } from "./import-providers.js";

interface CategoryData {
  name: string;
  slug: string;
  description: string;
  icon: string;
  uiTemplate: string;
  subcategories: { name: string; slug: string }[];
  attributes: { label: string; appliesTo: "lead" | "provider"; fieldType: "text" | "number" | "select" | "multiselect" | "boolean"; options?: string[] }[];
}

// The default directory, shared with dialnfind-provider-discovery (which maps what it finds onto these slugs).
const CATEGORIES: CategoryData[] = JSON.parse(readFileSync(`${DATA_DIR}/categories.json`, "utf8"));

const BADGES = [
  { name: "Top Rated", criteriaDescription: "Average rating of 4.5 or higher from at least 10 reviews" },
  { name: "Verified Pro", criteriaDescription: "Phone and business documents verified by DialNFind" },
  { name: "Quick Responder", criteriaDescription: "Most customers report a quick response" },
  { name: "Pro Partner", criteriaDescription: "Active Pro plan subscriber" },
  { name: "Business Partner", criteriaDescription: "Active Business plan subscriber" },
];

// The code decides the entitlements (src/lib/plans.ts) and must never change; prices include GST.
const PLANS = [
  {
    code: "free",
    name: "Free",
    price: 0,
    leadAccessLimit: 10,
    photoLimit: 3,
    analyticsEnabled: false,
    rankingBoost: 0,
    badge: null,
    featuresJson: ["Business listing", "10 leads a month with full details", "Customer reviews", "3 portfolio photos"],
    prices: [],
  },
  {
    code: "pro",
    name: "Pro",
    price: 599,
    leadAccessLimit: null,
    photoLimit: 30,
    analyticsEnabled: true,
    rankingBoost: 0.025,
    badge: "Pro Partner",
    featuresJson: ["Unlimited leads", "Profile analytics and ranking", "WhatsApp button", "30 portfolio photos", "Pro Partner badge"],
    prices: [
      { billingCycle: "monthly", amount: 599, iosProductId: "dnf_pro_monthly", androidProductId: "dnf_pro:monthly" },
      { billingCycle: "yearly", amount: 5990, iosProductId: "dnf_pro_yearly", androidProductId: "dnf_pro:yearly" },
    ],
  },
  {
    code: "business",
    name: "Business",
    price: 999,
    leadAccessLimit: null,
    photoLimit: null,
    analyticsEnabled: true,
    rankingBoost: 0.04,
    badge: "Business Partner",
    featuresJson: ["Everything in Pro", "Sponsored campaigns", "Priority support", "Unlimited portfolio photos", "Business Partner badge"],
    prices: [
      { billingCycle: "monthly", amount: 999, iosProductId: "dnf_business_monthly", androidProductId: "dnf_business:monthly" },
      { billingCycle: "yearly", amount: 9990, iosProductId: "dnf_business_yearly", androidProductId: "dnf_business:yearly" },
    ],
  },
] as const;

// Support phone and published legal links are left for the team to fill in under Settings.
// The support address starts as the mail inbox from .env; without one it is left empty rather than made up.
const supportEmail = (process.env.SUPPORT_EMAIL || process.env.SMTP_USER || "").trim().toLowerCase();
const SETTINGS = [
  { key: "sponsored_cpc", value: "5" },
  { key: "sponsored_min_budget", value: "500" },
  ...(supportEmail ? [{ key: "support_email", value: supportEmail }] : []),
  { key: "default_search_radius_km", value: "15" },
  { key: "support_hours", value: "Mon to Sat, 9 AM to 7 PM" },
  { key: "auto_approve_listings", value: "false" },
];

const ADMIN_ROLES = [
  { name: "Operations", description: "Approves listings, checks documents and keeps categories tidy.", permissions: ["providers", "verifications", "categories", "reviews", "support", "leads"] },
  { name: "Support agent", description: "Answers tickets and helps customers and providers with their accounts.", permissions: ["support", "users", "reviews"] },
  { name: "Finance", description: "Plans, payments, promotions and revenue reports.", permissions: ["plans", "promotions", "analytics"] },
];

async function main() {
  const log: string[] = [];

  const badgeIds: Record<string, bigint> = {};
  for (const b of BADGES) {
    const badge = await prisma.badge.upsert({ where: { name: b.name }, update: {}, create: b });
    badgeIds[b.name] = badge.id;
  }

  for (const { prices, badge, ...plan } of PLANS) {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { code: plan.code } });
    if (existing) continue;
    await prisma.subscriptionPlan.create({
      data: { ...plan, featuresJson: [...plan.featuresJson], badgeId: badge ? badgeIds[badge] : null, prices: { create: prices.map((p) => ({ ...p })) } },
    });
    log.push(`plan ${plan.code}`);
  }

  const settings = await prisma.setting.createMany({ data: SETTINGS, skipDuplicates: true });
  if (settings.count) log.push(`${settings.count} settings`);

  for (const role of ADMIN_ROLES) {
    await prisma.adminRole.upsert({ where: { name: role.name }, update: {}, create: role });
  }

  // Categories only on an empty directory, so ones the team renamed or removed are not brought back.
  if ((await prisma.category.count()) === 0) {
    for (const [index, c] of CATEGORIES.entries()) {
      await prisma.category.create({
        data: {
          name: c.name,
          slug: c.slug,
          description: c.description,
          iconUrl: `lucide:${c.icon}`,
          uiTemplate: c.uiTemplate,
          displayOrder: index,
          subcategories: { create: c.subcategories.map((sub, i) => ({ name: sub.name, slug: sub.slug, displayOrder: i })) },
          attributes: {
            create: c.attributes.map((a, i) => ({ appliesTo: a.appliesTo, label: a.label, fieldType: a.fieldType, optionsJson: a.options ?? Prisma.JsonNull, displayOrder: i })),
          },
        },
      });
    }
    await recalculateCategoryCounts();
    log.push(`${CATEGORIES.length} categories`);
  }

  if ((await prisma.user.count({ where: { role: "super_admin" } })) === 0) {
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";
    if (!email || password.length < 12) {
      throw new Error("No super admin yet. Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (12 or more characters) and run again.");
    }
    await prisma.user.create({
      data: { role: "super_admin", name: "DialNFind Admin", email, passwordHash: await bcrypt.hash(password, 12), emailVerifiedAt: new Date(), termsAcceptedAt: new Date() },
    });
    log.push(`super admin ${email}`);
  }

  if (process.env.BOOTSTRAP_IMPORT_PROVIDERS !== "false") {
    const imported = await importProviderBundles();
    if (imported.files) console.log(`Provider import: ${describe(imported)}`);
    if (imported.imported) log.push(`${imported.imported} providers`);
  }

  console.log(log.length ? `Bootstrap added: ${log.join(", ")}` : "Bootstrap: nothing to add");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
