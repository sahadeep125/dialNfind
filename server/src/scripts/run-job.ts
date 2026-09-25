/** Runs one scheduled job now. Usage: pnpm --filter server job <name> */
import { prisma } from "../lib/prisma.js";
import { JOBS, runJob } from "../jobs/index.js";

const name = process.argv[2];
if (!name || !JOBS[name]) {
  console.error(`Usage: pnpm --filter server job <name>\nJobs: ${Object.keys(JOBS).join(", ")}`);
  process.exit(1);
}
const ok = await runJob(name);
await prisma.$disconnect();
process.exit(ok ? 0 : 1);
