/* Demo seed: realistic directory data across five cities so every page has something to show.
 * Deterministic (seeded PRNG) so screenshots and tests stay stable between runs.
 * Run with `pnpm --filter server db:seed`. Wipes all tables first. */
import { PrismaClient, Prisma, type PriceUnit } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CATEGORIES, CITIES, FIRST_NAMES, GENERIC_REVIEWS, LAST_NAMES, PROVIDER_REPLIES } from "./seed-data.js";
import { recalculateCategoryCounts, recalculateProvider } from "../src/services/ranking.js";
import { slugify } from "../src/lib/slug.js";

const prisma = new PrismaClient();

// mulberry32
let state = 20260924;
function rand(): number {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const chance = (p: number) => rand() < p;
function sample<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
}
const jitter = (v: number, spread = 0.006) => Math.round((v + (rand() - 0.5) * spread * 2) * 1e6) / 1e6;
const phone = () => `+91${pick(["98", "97", "96", "94", "93", "90", "88", "81", "79", "70"])}${String(int(10000000, 99999999))}`;
const roundPrice = (n: number) => (n >= 1000 ? Math.round(n / 100) * 100 - 1 : Math.round(n / 50) * 50 - 1);
const daysAgo = (d: number) => new Date(Date.now() - d * 864e5 - int(0, 86_000) * 1000);

const HOURS_PATTERNS: { dayOfWeek: number; openTime: string | null; closeTime: string | null; is24x7: boolean }[][] = [
  // Mon-Sat 9-8, Sunday closed
  [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, openTime: d === 0 ? null : "09:00", closeTime: d === 0 ? null : "20:00", is24x7: false })),
  // Every day 8-10
  [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, openTime: "08:00", closeTime: "22:00", is24x7: false })),
  // Mon-Sat 10-7, Sunday 10-2
  [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, openTime: "10:00", closeTime: d === 0 ? "14:00" : "19:00", is24x7: false })),
  // 24x7 emergency
  [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, openTime: null, closeTime: null, is24x7: true })),
  // Mon-Fri 9:30-6:30, Sat 10-4
  [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    dayOfWeek: d,
    openTime: d === 0 ? null : d === 6 ? "10:00" : "09:30",
    closeTime: d === 0 ? null : d === 6 ? "16:00" : "18:30",
    is24x7: false,
  })),
];

async function wipe() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', 'spatial_ref_sys')`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  }
}

async function main() {
  console.log("Wiping existing data...");
  await wipe();
  const passwordHash = await bcrypt.hash("password123", 10);

  // Users -------------------------------------------------------------------------------------
  const admin = await prisma.user.create({
    data: { role: "super_admin", name: "Platform Admin", email: "admin@dialnfind.com", passwordHash, emailVerifiedAt: new Date(), termsAcceptedAt: new Date() },
  });
  const demoCustomer = await prisma.user.create({
    data: {
      role: "customer",
      name: "Ananya Sen",
      email: "demo@dialnfind.com",
      phone: "+919800012345",
      passwordHash,
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
    },
  });
  const demoProviderUser = await prisma.user.create({
    data: {
      role: "provider",
      name: "Rakesh Sharma",
      email: "provider@dialnfind.com",
      phone: "+919832098320",
      passwordHash,
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
    },
  });
  await prisma.user.create({
    data: { role: "provider", name: "New Provider", email: "newprovider@dialnfind.com", passwordHash, termsAcceptedAt: new Date() },
  });

  const customers = [demoCustomer];
  for (let i = 0; i < 60; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = pick(LAST_NAMES);
    customers.push(
      await prisma.user.create({
        data: {
          role: "customer",
          name: `${first} ${last}`,
          email: `${slugify(first)}.${slugify(last)}${i}@example.com`,
          passwordHash,
          termsAcceptedAt: daysAgo(int(30, 400)),
        },
      }),
    );
  }

  await prisma.userAddress.createMany({
    data: [
      { userId: demoCustomer.id, label: "Home", addressLine: "12 Sevoke Road, near Vishal Cinema", city: "Siliguri", state: "West Bengal", pincode: "734001", latitude: 26.7335, longitude: 88.4318, isDefault: true },
      { userId: demoCustomer.id, label: "Work", addressLine: "City Centre, Matigara", city: "Siliguri", state: "West Bengal", pincode: "734010", latitude: 26.7128, longitude: 88.3876, isDefault: false },
    ],
  });

  // Badges & plans ----------------------------------------------------------------------------
  const badgeDefs = [
    { name: "Top Rated", criteriaDescription: "Average rating of 4.5 or higher from at least 10 reviews" },
    { name: "Verified Pro", criteriaDescription: "Phone and business documents verified by DialNFind" },
    { name: "Quick Responder", criteriaDescription: "Most customers report a quick response" },
    { name: "Pro Partner", criteriaDescription: "Active Pro plan subscriber" },
    { name: "Premium Partner", criteriaDescription: "Active Premium plan subscriber" },
  ];
  const badges: Record<string, bigint> = {};
  for (const b of badgeDefs) badges[b.name] = (await prisma.badge.create({ data: b })).id;

  const plans = {
    Free: await prisma.subscriptionPlan.create({
      data: { name: "Free", price: 0, leadAccessLimit: 10, analyticsEnabled: false, rankingBoost: 0, featuresJson: ["Business listing", "Up to 10 leads a month", "Customer reviews"] },
    }),
    Basic: await prisma.subscriptionPlan.create({
      data: { name: "Basic", price: 299, leadAccessLimit: 50, analyticsEnabled: false, rankingBoost: 0.01, featuresJson: ["Everything in Free", "Up to 50 leads a month", "WhatsApp button", "Photo gallery"] },
    }),
    Pro: await prisma.subscriptionPlan.create({
      data: {
        name: "Pro",
        price: 599,
        leadAccessLimit: null,
        analyticsEnabled: true,
        rankingBoost: 0.025,
        badgeId: badges["Pro Partner"],
        featuresJson: ["Everything in Basic", "Unlimited leads", "Profile analytics", "Pro Partner badge"],
      },
    }),
    Premium: await prisma.subscriptionPlan.create({
      data: {
        name: "Premium",
        price: 999,
        leadAccessLimit: null,
        analyticsEnabled: true,
        rankingBoost: 0.04,
        badgeId: badges["Premium Partner"],
        featuresJson: ["Everything in Pro", "Priority support", "Premium Partner badge", "Sponsored placement credits"],
      },
    }),
  };

  await prisma.setting.createMany({
    data: [
      { key: "lead_fee_amount", value: "10" },
      { key: "support_email", value: "support@dialnfind.com" },
      { key: "support_phone", value: "+918001234567" },
      { key: "default_search_radius_km", value: "15" },
    ],
  });

  // Categories --------------------------------------------------------------------------------
  const categoryRows: { id: bigint; seed: (typeof CATEGORIES)[number]; subs: { id: bigint; name: string }[] }[] = [];
  for (const [index, c] of CATEGORIES.entries()) {
    const category = await prisma.category.create({
      data: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        iconUrl: `lucide:${c.icon}`,
        uiTemplate: c.uiTemplate,
        displayOrder: index,
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });
    const subs = [];
    for (const [subIndex, name] of c.subcategories.entries()) {
      subs.push(
        await prisma.subcategory.create({
          data: { categoryId: category.id, name, slug: slugify(name), displayOrder: subIndex, createdBy: admin.id, updatedBy: admin.id },
        }),
      );
    }
    for (const [attrIndex, a] of c.attributes.entries()) {
      await prisma.categoryAttribute.create({
        data: {
          categoryId: category.id,
          appliesTo: a.appliesTo,
          label: a.label,
          fieldType: a.fieldType,
          optionsJson: a.options ?? Prisma.JsonNull,
          displayOrder: attrIndex,
          createdBy: admin.id,
        },
      });
    }
    await prisma.adminActivityLog.create({
      data: { adminId: admin.id, action: "category.create", targetType: "category", targetId: category.id, detailsJson: { name: c.name } },
    });
    categoryRows.push({ id: category.id, seed: c, subs });
  }

  // Providers ---------------------------------------------------------------------------------
  console.log("Creating providers...");
  const usedNames = new Set<string>();
  const providerIds: bigint[] = [];
  let demoProviderId: bigint | null = null;

  for (const city of CITIES) {
    for (const cat of categoryRows) {
      // Extra depth for the headline demo search: TV repair in Siliguri.
      const count = city.city === "Siliguri" && cat.seed.slug === "electronics-repair" ? 10 : city.providersPerCategory;
      for (let n = 0; n < count; n++) {
        let businessName = "";
        for (let tries = 0; tries < 20; tries++) {
          businessName = `${pick(cat.seed.nameParts.brands)} ${pick(cat.seed.nameParts.nouns)}`;
          if (!usedNames.has(`${businessName}|${city.city}`)) break;
        }
        const isDemo = city.city === "Siliguri" && cat.seed.slug === "electronics-repair" && n === 0;
        if (isDemo) businessName = "Sharma TV & Electronics Care";
        usedNames.add(`${businessName}|${city.city}`);

        const locality = isDemo ? city.localities[0] : city.localities[(n + categoryRows.indexOf(cat)) % city.localities.length];
        const lat = isDemo ? 26.7338 : jitter(locality.lat);
        const lng = isDemo ? 88.4325 : jitter(locality.lng);
        const verificationStatus = isDemo ? "verified" : pick(["verified", "verified", "partial", "partial", "none"] as const);
        const providerPhone = isDemo ? "+919832098320" : phone();
        const primarySub = isDemo ? cat.subs[0] : cat.subs[(n + int(0, 2)) % cat.subs.length];
        const otherSubs = sample(cat.subs.filter((s) => s.id !== primarySub.id), isDemo ? 3 : int(1, 3));
        // TV repair is the headline demo search, so most electronics shops offer it.
        if (cat.seed.slug === "electronics-repair" && primarySub.id !== cat.subs[0].id && !otherSubs.includes(cat.subs[0]) && chance(0.75)) {
          otherSubs.unshift(cat.subs[0]);
        }
        const slug = slugify(`${businessName} ${locality.name} ${city.city}`);

        const provider = await prisma.provider.create({
          data: {
            userId: isDemo ? demoProviderUser.id : null,
            claimedAt: isDemo ? daysAgo(200) : null,
            slug,
            businessName,
            description: isDemo
              ? "Family-run TV and electronics repair centre on Sevoke Road since 2009. We repair LED, LCD, OLED and smart TVs of every major brand, plus home theatres and set-top boxes. Our technicians carry common spares so most faults are fixed at your home in one visit, and every repair comes with a 90-day warranty."
              : pick(cat.seed.blurbs),
            businessType: chance(0.55) ? "individual" : "company",
            yearsExperience: isDemo ? 15 : int(2, 22),
            phone: providerPhone,
            whatsappNumber: chance(0.8) ? providerPhone : phone(),
            email: chance(0.5) || isDemo ? `${slugify(businessName).replace(/-/g, "")}@gmail.com` : null,
            website: chance(0.15) ? `https://www.${slugify(businessName).replace(/-/g, "")}.in` : null,
            addressLine: `${int(1, 250)}, ${pick(["Main Road", "1st Floor, Market Complex", "Near Bus Stand", "Opp. City Mall", "Lane 3", "Ground Floor"])}, ${locality.name}`,
            locality: locality.name,
            city: city.city,
            state: city.state,
            pincode: locality.pincode,
            latitude: lat,
            longitude: lng,
            serviceRadiusKm: pick([5, 8, 10, 12, 15, 20]),
            acceptsCalls: true,
            acceptsWhatsapp: chance(0.85),
            isAvailable: isDemo || chance(0.93),
            selfReportedCompletedJobs: chance(0.6) ? int(40, 3000) : null,
            verificationStatus,
            status: "active",
            createdAt: daysAgo(int(60, 900)),
          },
        });
        providerIds.push(provider.id);
        if (isDemo) demoProviderId = provider.id;

        // Hours
        const pattern = isDemo ? HOURS_PATTERNS[1] : cat.seed.slug === "electricians" || cat.seed.slug === "plumbing" ? pick([HOURS_PATTERNS[1], HOURS_PATTERNS[3]]) : pick(HOURS_PATTERNS);
        await prisma.providerBusinessHour.createMany({ data: pattern.map((h) => ({ ...h, providerId: provider.id })) });

        // Service areas
        const areas = [locality, ...sample(city.localities.filter((l) => l.name !== locality.name), int(2, 5))];
        await prisma.providerServiceArea.createMany({
          data: areas.map((a) => ({ providerId: provider.id, areaName: a.name, pincode: a.pincode, latitude: a.lat, longitude: a.lng })),
        });

        // Services
        const [lo, hi] = cat.seed.priceRange;
        const services = [primarySub, ...otherSubs];
        await prisma.providerService.createMany({
          data: services.map((s, i) => ({
            providerId: provider.id,
            categoryId: cat.id,
            subcategoryId: s.id,
            startingPrice: roundPrice(lo + rand() * (hi - lo)),
            priceUnit: cat.seed.priceUnit as PriceUnit,
            isPrimary: i === 0,
          })),
        });

        // Verifications
        if (verificationStatus !== "none") {
          await prisma.verification.create({
            data: { providerId: provider.id, type: "phone", status: "approved", verifiedBy: admin.id, verifiedAt: daysAgo(int(10, 200)) },
          });
        }
        if (verificationStatus === "verified") {
          await prisma.verification.create({
            data: { providerId: provider.id, type: "business", status: "approved", verifiedBy: admin.id, verifiedAt: daysAgo(int(10, 200)), documentUrl: "https://example.com/docs/trade-licence.pdf" },
          });
          await prisma.providerBadge.create({ data: { providerId: provider.id, badgeId: badges["Verified Pro"] } });
        }

        // Leads (last 60 days)
        const leadCount = isDemo ? 140 : int(3, 40);
        const leadData: Prisma.LeadCreateManyInput[] = [];
        for (let i = 0; i < leadCount; i++) {
          const customer = chance(0.6) ? pick(customers.slice(1)) : null;
          const responded = customer && chance(0.5) ? chance(0.86) : null;
          leadData.push({
            userId: customer?.id ?? null,
            providerId: provider.id,
            categoryId: cat.id,
            subcategoryId: pick(services).id,
            channel: chance(0.68) ? "call" : "whatsapp",
            source: pick(["search", "search", "category_browse", "profile"] as const),
            customerReportedResponse: responded,
            customerReportedResponseAt: responded === null ? null : new Date(),
            createdAt: daysAgo(isDemo ? Math.floor(Math.pow(rand(), 1.3) * 60) : int(0, 60)),
          });
        }
        await prisma.lead.createMany({ data: leadData });

        // Reviews
        const reviewCount = isDemo ? 38 : Math.floor(Math.pow(rand(), 1.4) * 32);
        const skew = isDemo ? 0.98 : 0.55 + rand() * 0.4;
        const reviewers = sample(customers.slice(1), reviewCount);
        for (const reviewer of reviewers) {
          const rating = rand() < skew ? (isDemo ? pick([5, 5, 5, 4]) : pick([5, 5, 4])) : pick([4, 3, 3, 2, 1]);
          const text =
            rating >= 4
              ? pick([...cat.seed.reviewSnippets, ...cat.seed.reviewSnippets, ...GENERIC_REVIEWS])
              : pick([
                  "Work was fine but they arrived much later than promised.",
                  "Charged more than the estimate given on the phone.",
                  "Problem came back after a week, had to call them again.",
                  "Average service. Took two visits to fix.",
                ]);
          const created = daysAgo(int(1, 360));
          await prisma.review.create({
            data: {
              providerId: provider.id,
              userId: reviewer.id,
              rating,
              reviewText: text,
              providerReply: chance(isDemo ? 0.7 : 0.35) ? pick(PROVIDER_REPLIES) : null,
              providerReplyAt: created,
              createdAt: created,
            },
          });
        }

        // Daily stats (last 45 days)
        const baseViews = isDemo ? 38 : int(2, 25);
        const stats: Prisma.ProviderDailyStatCreateManyInput[] = [];
        for (let d = 0; d < 45; d++) {
          const date = new Date();
          date.setUTCHours(0, 0, 0, 0);
          date.setUTCDate(date.getUTCDate() - d);
          const weekday = date.getUTCDay();
          const factor = (weekday === 0 || weekday === 6 ? 1.3 : 1) * (1 + (45 - d) / 90);
          stats.push({
            providerId: provider.id,
            date,
            profileViews: Math.round(baseViews * factor * (0.6 + rand() * 0.8)),
            searchImpressions: Math.round(baseViews * 6 * factor * (0.6 + rand() * 0.8)),
          });
        }
        await prisma.providerDailyStat.createMany({ data: stats });
      }
    }
  }

  // Demo provider extras ----------------------------------------------------------------------
  if (demoProviderId) {
    await prisma.providerSubscription.create({
      data: { providerId: demoProviderId, planId: plans.Pro.id, startDate: daysAgo(20), endDate: new Date(Date.now() + 10 * 864e5), status: "active" },
    });
    await prisma.transaction.createMany({
      data: [
        { providerId: demoProviderId, type: "subscription", amount: 599, status: "success", gatewayTxnId: "sim_demo_001", createdAt: daysAgo(50) },
        { providerId: demoProviderId, type: "subscription", amount: 599, status: "success", gatewayTxnId: "sim_demo_002", createdAt: daysAgo(20) },
      ],
    });
    await prisma.providerBadge.createMany({
      data: [
        { providerId: demoProviderId, badgeId: badges["Pro Partner"] },
        { providerId: demoProviderId, badgeId: badges["Top Rated"] },
        { providerId: demoProviderId, badgeId: badges["Quick Responder"] },
      ],
      skipDuplicates: true,
    });
    await prisma.sponsoredListing.create({
      data: {
        providerId: demoProviderId,
        categoryId: categoryRows[0].id,
        targetLocation: "Siliguri",
        startDate: daysAgo(10),
        endDate: new Date(Date.now() + 20 * 864e5),
        budget: 2000,
        amountSpent: 640,
        impressions: 4120,
        clicks: 188,
      },
    });
    await prisma.notification.createMany({
      data: [
        { userId: demoProviderUser.id, type: "lead", title: "New call from DialNFind", body: "A customer near Sevoke Road tapped to call you.", createdAt: daysAgo(0) },
        { userId: demoProviderUser.id, type: "review", title: "New 5-star review", body: "TV had no picture after a power cut. Technician came within two hours...", createdAt: daysAgo(1) },
      ],
    });
  }

  // Demo customer: favorites and a couple of reviews already exist from the random pass.
  const siliguriElectronics = await prisma.provider.findMany({
    where: { city: "Siliguri", services: { some: { categoryId: categoryRows[0].id } } },
    take: 3,
    select: { id: true },
  });
  const siliguriAppliances = await prisma.provider.findMany({
    where: { city: "Siliguri", services: { some: { categoryId: categoryRows[1].id } } },
    take: 2,
    select: { id: true },
  });
  await prisma.favorite.createMany({
    data: [...siliguriElectronics, ...siliguriAppliances].map((p) => ({ userId: demoCustomer.id, providerId: p.id })),
    skipDuplicates: true,
  });
  const demoContacts = [...siliguriElectronics, ...siliguriAppliances];
  for (const [i, p] of demoContacts.entries()) {
    const lead = await prisma.lead.create({
      data: {
        userId: demoCustomer.id,
        providerId: p.id,
        categoryId: i < siliguriElectronics.length ? categoryRows[0].id : categoryRows[1].id,
        channel: i % 2 === 0 ? "call" : "whatsapp",
        source: "search",
        customerReportedResponse: i < 3 ? true : null,
        customerReportedResponseAt: i < 3 ? daysAgo(i * 6) : null,
        createdAt: daysAgo(i * 7 + 1),
      },
    });
    // Demo customer reviewed the first two providers they contacted.
    if (i === 1 || i === 3) {
      await prisma.review.deleteMany({ where: { providerId: p.id, userId: demoCustomer.id } });
      await prisma.review.create({
        data: {
          providerId: p.id,
          userId: demoCustomer.id,
          leadId: lead.id,
          rating: i === 1 ? 5 : 4,
          reviewText:
            i === 1
              ? "Our smart TV kept restarting. The technician diagnosed a faulty power board, replaced it at home and walked me through the warranty. Quick and honest."
              : "Fridge was not cooling. They came the next morning and fixed the thermostat. Slightly pricey but reliable.",
          providerReply: i === 1 ? "Thank you Ananya! Glad your TV is working well again." : null,
          providerReplyAt: i === 1 ? daysAgo(i * 7) : null,
          createdAt: daysAgo(i * 7),
        },
      });
    }
  }

  // Search history for the "popular searches" strip.
  const popular = ["TV Repair", "AC Repair & Service", "Electrician", "Plumber", "Pest Control", "Deep cleaning", "Packers and movers", "Maths tutor", "Car service", "Washing machine repair"];
  await prisma.searchQuery.createMany({
    data: popular.flatMap((term, i) =>
      Array.from({ length: 30 - i * 2 }, () => ({ rawQuery: term, resultsCount: int(3, 25), createdAt: daysAgo(int(0, 25)) })),
    ),
  });

  // Unclaimed listing the "new provider" demo account can claim.
  console.log("Recalculating rankings...");
  for (const id of providerIds) await recalculateProvider(id);
  await recalculateCategoryCounts();

  // Top Rated badges follow from the recalculated ratings.
  const topRated = await prisma.provider.findMany({ where: { avgRating: { gte: 4.5 }, totalReviews: { gte: 10 } }, select: { id: true } });
  await prisma.providerBadge.createMany({
    data: topRated.map((p) => ({ providerId: p.id, badgeId: badges["Top Rated"] })),
    skipDuplicates: true,
  });

  const counts = {
    users: await prisma.user.count(),
    providers: await prisma.provider.count(),
    reviews: await prisma.review.count(),
    leads: await prisma.lead.count(),
  };
  console.log("Seed complete", counts);
  console.log("Logins (password123): demo@dialnfind.com, provider@dialnfind.com, newprovider@dialnfind.com, admin@dialnfind.com");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
