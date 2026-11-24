/* Production bootstrap: the reference data the API needs, one super admin, and the real provider listings in
 * prisma/data/providers-*.json. No demo users, reviews or leads. Safe to run on every deploy: it only adds what
 * is missing and never changes rows the team has since edited in the admin console (settings, categories,
 * listings).
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
  /** What an individual offering it is called ("Plumber"); see services/professions.ts. */
  professionName?: string;
  subcategories: { name: string; slug: string; professionName?: string }[];
  attributes: { label: string; appliesTo: "lead" | "provider"; fieldType: "text" | "number" | "select" | "multiselect" | "boolean"; options?: string[] }[];
}

// The default directory, shared with kaajva-provider-discovery (which maps what it finds onto these slugs).
const CATEGORIES: CategoryData[] = JSON.parse(readFileSync(`${DATA_DIR}/categories.json`, "utf8"));

/** Written search content for each default category page (title, description, heading, text, questions). */
interface CategoryPageData {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  seoHeading: string;
  imageAlt: string;
  seoContent: string;
  faqs: { q: string; a: string }[];
  /** The suggested photo to upload in the admin console (Unsplash License); not written by bootstrap. */
  photo?: { source: string; photographer: string; license: string };
}
const CATEGORY_PAGES: CategoryPageData[] = JSON.parse(readFileSync(`${DATA_DIR}/category-pages.json`, "utf8"));

/**
 * Fills the page content of categories whose page has never been written, so a deploy gives every default
 * category a full page. A category with any of title, description or text already set (written in the admin
 * console) is left alone. Photos are uploaded in the admin console.
 */
async function fillCategoryPages() {
  let filled = 0;
  for (const page of CATEGORY_PAGES) {
    const { slug, seoTitle, seoDescription, seoHeading, seoContent, faqs } = page;
    const { count } = await prisma.category.updateMany({
      where: { slug, seoTitle: null, seoDescription: null, seoContent: null },
      data: { seoTitle, seoDescription, seoHeading, seoContent, faqs },
    });
    // The photo description is only useful once a photo is uploaded; keep it ready without overwriting one.
    if (count) await prisma.category.updateMany({ where: { slug, imageAlt: null }, data: { imageAlt: page.imageAlt } });
    filled += count;
  }
  return filled ? `${filled} category pages` : null;
}

const BADGES = [
  { name: "Top Rated", criteriaDescription: "Average rating of 4.5 or higher from at least 10 reviews" },
  { name: "Verified Pro", criteriaDescription: "Phone and business documents verified by KaajVa" },
  { name: "Quick Responder", criteriaDescription: "Most customers report a quick response" },
];

// Published legal links are left for the team to fill in under Settings; the support phone falls back to the
// default in services/settings.ts. The support address is SUPPORT_EMAIL from .env, or the KaajVa support inbox.
const supportEmail = (process.env.SUPPORT_EMAIL || "support@kaajva.in").trim().toLowerCase();
const SETTINGS = [
  ...(supportEmail ? [{ key: "support_email", value: supportEmail }] : []),
  { key: "default_search_radius_km", value: "15" },
  { key: "support_hours", value: "Mon to Sat, 9 AM to 7 PM" },
  { key: "auto_approve_listings", value: "false" },
];

const ADMIN_ROLES = [
  { name: "Operations", description: "Approves listings, checks documents and keeps categories tidy.", permissions: ["providers", "verifications", "categories", "reviews", "support", "leads"] },
  { name: "Support agent", description: "Answers tickets and helps customers and providers with their accounts.", permissions: ["support", "users", "reviews"] },
];

async function createCategory(c: CategoryData, index: number) {
  await prisma.category.create({
    data: {
      name: c.name,
      slug: c.slug,
      description: c.description,
      iconUrl: `lucide:${c.icon}`,
      uiTemplate: c.uiTemplate,
      professionName: c.professionName ?? null,
      displayOrder: index,
      subcategories: { create: c.subcategories.map((sub, i) => ({ name: sub.name, slug: sub.slug, professionName: sub.professionName ?? null, displayOrder: i })) },
      attributes: {
        create: c.attributes.map((a, i) => ({ appliesTo: a.appliesTo, label: a.label, fieldType: a.fieldType, optionsJson: a.options ?? Prisma.JsonNull, displayOrder: i })),
      },
    },
  });
}

/**
 * One-time upgrade for a directory created before individual professionals: names the profession for each
 * existing category and service ("Plumber" for Plumbing) and adds the new profession categories (Locksmith,
 * Tailoring, Drivers...). Runs only while no category or service has a profession name yet, so later edits
 * and removals by the team stick.
 */
async function addProfessions(): Promise<string | null> {
  const named = (await prisma.category.count({ where: { professionName: { not: null } } })) + (await prisma.subcategory.count({ where: { professionName: { not: null } } }));
  if (named > 0) return null;
  let created = 0;
  let labelled = 0;
  const lastOrder = (await prisma.category.aggregate({ _max: { displayOrder: true } }))._max.displayOrder ?? 0;
  for (const c of CATEGORIES) {
    const existing = await prisma.category.findUnique({ where: { slug: c.slug }, select: { id: true } });
    if (!existing) {
      await createCategory(c, lastOrder + 1 + created);
      created++;
      continue;
    }
    if (c.professionName) labelled += (await prisma.category.updateMany({ where: { id: existing.id, professionName: null }, data: { professionName: c.professionName } })).count;
    for (const sub of c.subcategories) {
      if (sub.professionName) labelled += (await prisma.subcategory.updateMany({ where: { slug: sub.slug, professionName: null }, data: { professionName: sub.professionName } })).count;
    }
  }
  if (created) await recalculateCategoryCounts();
  return created || labelled ? `${created} profession categories, ${labelled} profession names` : null;
}

async function main() {
  const log: string[] = [];

  for (const b of BADGES) {
    await prisma.badge.upsert({ where: { name: b.name }, update: {}, create: b });
  }

  const settings = await prisma.setting.createMany({ data: SETTINGS, skipDuplicates: true });
  if (settings.count) log.push(`${settings.count} settings`);

  for (const role of ADMIN_ROLES) {
    await prisma.adminRole.upsert({ where: { name: role.name }, update: {}, create: role });
  }

  // Categories only on an empty directory, so ones the team renamed or removed are not brought back.
  if ((await prisma.category.count()) === 0) {
    for (const [index, c] of CATEGORIES.entries()) await createCategory(c, index);
    await recalculateCategoryCounts();
    log.push(`${CATEGORIES.length} categories`);
  } else {
    const added = await addProfessions();
    if (added) log.push(added);
  }
  const pages = await fillCategoryPages();
  if (pages) log.push(pages);

  if ((await prisma.user.count({ where: { role: "super_admin" } })) === 0) {
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";
    if (!email || password.length < 10) {
      throw new Error("No super admin yet. Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (10 or more characters) and run again.");
    }
    await prisma.user.create({
      data: { role: "super_admin", name: "KaajVa Admin", email, passwordHash: await bcrypt.hash(password, 12), emailVerifiedAt: new Date(), termsAcceptedAt: new Date() },
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
