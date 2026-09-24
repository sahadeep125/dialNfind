import { prisma } from "../lib/prisma.js";
import { recalculateCategoryCounts, recalculateProvider } from "../services/ranking.js";

const providers = await prisma.provider.findMany({ select: { id: true } });
for (const p of providers) await recalculateProvider(p.id);
await recalculateCategoryCounts();
console.log(`Recalculated ${providers.length} providers`);
await prisma.$disconnect();
