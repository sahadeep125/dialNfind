import { prisma } from "../lib/prisma.js";
import { num } from "../lib/serialize.js";

/** Minimum customer follow-ups before the response signal is trusted. */
const MIN_RESPONSE_SAMPLES = 5;
const PRIOR_MEAN = 3.8;
const PRIOR_WEIGHT = 5;

export interface CompletenessItem {
  key: string;
  label: string;
  done: boolean;
}

type ProviderForCompleteness = {
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  yearsExperience: number | null;
  whatsappNumber: string | null;
  addressLine: string | null;
  email: string | null;
  website: string | null;
  verificationStatus: string;
  _count: { businessHours: number; serviceAreas: number; services: number; portfolio: number };
};

export function completenessChecklist(p: ProviderForCompleteness): CompletenessItem[] {
  return [
    { key: "description", label: "Write a description of at least 80 characters", done: (p.description?.length ?? 0) >= 80 },
    { key: "logo", label: "Upload a logo or profile photo", done: !!p.logoUrl },
    { key: "cover", label: "Add a cover image", done: !!p.coverUrl },
    { key: "services", label: "Add the services you offer", done: p._count.services > 0 },
    { key: "hours", label: "Set your working hours", done: p._count.businessHours > 0 },
    { key: "areas", label: "List the areas you serve", done: p._count.serviceAreas > 0 },
    { key: "portfolio", label: "Add photos of your work", done: p._count.portfolio > 0 },
    { key: "experience", label: "Add your years of experience", done: p.yearsExperience !== null },
    { key: "whatsapp", label: "Add a WhatsApp number", done: !!p.whatsappNumber },
    { key: "address", label: "Add your business address", done: !!p.addressLine },
    { key: "contact", label: "Add an email or website", done: !!(p.email || p.website) },
    { key: "verification", label: "Verify your business", done: p.verificationStatus !== "none" },
  ];
}

export function completenessPct(items: CompletenessItem[]): number {
  return Math.round((items.filter((i) => i.done).length / items.length) * 100);
}

export function computeRankingScore(input: {
  avgRating: number;
  totalReviews: number;
  completenessPct: number;
  verificationStatus: string;
  responseSignal: number | null;
  planBoost: number;
  isAvailable: boolean;
}): number {
  const bayesian = (PRIOR_MEAN * PRIOR_WEIGHT + input.avgRating * input.totalReviews) / (PRIOR_WEIGHT + input.totalReviews);
  const rating = (bayesian - 1) / 4;
  const volume = Math.min(1, Math.log10(1 + input.totalReviews) / 2);
  const completeness = input.completenessPct / 100;
  const verification = input.verificationStatus === "verified" ? 1 : input.verificationStatus === "partial" ? 0.5 : 0;
  const response = input.responseSignal ?? 0.5;
  let score = 0.4 * rating + 0.15 * volume + 0.15 * completeness + 0.15 * verification + 0.1 * response + input.planBoost;
  if (!input.isAvailable) score *= 0.5;
  return Math.round(score * 100 * 10000) / 10000;
}

/** Recomputes denormalized rating, response signal, completeness and ranking for one provider. */
export async function recalculateProvider(providerId: bigint): Promise<void> {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: {
      _count: { select: { businessHours: true, serviceAreas: true, services: true, portfolio: true } },
      subscriptions: { where: { status: { in: ["active", "past_due"] } }, include: { plan: true }, take: 1, orderBy: { startDate: "desc" } },
    },
  });
  if (!provider) return;

  const [ratingAgg, responses] = await Promise.all([
    prisma.review.aggregate({ where: { providerId, status: "published" }, _avg: { rating: true }, _count: true }),
    prisma.lead.groupBy({
      by: ["customerReportedResponse"],
      where: { providerId, customerReportedResponse: { not: null } },
      _count: true,
    }),
  ]);

  const avgRating = ratingAgg._avg.rating ?? 0;
  const totalReviews = ratingAgg._count;
  const answered = responses.reduce((acc, r) => acc + r._count, 0);
  const positive = responses.find((r) => r.customerReportedResponse === true)?._count ?? 0;
  const responseSignal = answered >= MIN_RESPONSE_SAMPLES ? positive / answered : null;

  const pct = completenessPct(completenessChecklist(provider));
  const planBoost = num(provider.subscriptions[0]?.plan.rankingBoost) ?? 0;
  const rankingScore = computeRankingScore({
    avgRating,
    totalReviews,
    completenessPct: pct,
    verificationStatus: provider.verificationStatus,
    responseSignal,
    planBoost,
    isAvailable: provider.isAvailable,
  });

  await prisma.provider.update({
    where: { id: providerId },
    data: {
      avgRating: Math.round(avgRating * 10) / 10,
      totalReviews,
      responseSignal,
      profileCompletenessPct: pct,
      rankingScore,
    },
  });
}

export async function recalculateCategoryCounts(): Promise<void> {
  await prisma.$executeRaw`
    UPDATE categories c SET provider_count = (
      SELECT COUNT(DISTINCT ps.provider_id)
      FROM provider_services ps
      JOIN providers p ON p.id = ps.provider_id AND p.status = 'active'
      WHERE ps.category_id = c.id
    )`;
}

/** Recalculates every provider, for the nightly job and `pnpm --filter server rank`. */
export async function recalculateAllProviders(): Promise<number> {
  const providers = await prisma.provider.findMany({ select: { id: true } });
  for (const p of providers) await recalculateProvider(p.id);
  await recalculateCategoryCounts();
  return providers.length;
}
