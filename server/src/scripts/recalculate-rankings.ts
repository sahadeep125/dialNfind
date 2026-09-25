import { prisma } from "../lib/prisma.js";
import { recalculateAllProviders } from "../services/ranking.js";

const count = await recalculateAllProviders();
console.log(`Recalculated ${count} providers`);
await prisma.$disconnect();
