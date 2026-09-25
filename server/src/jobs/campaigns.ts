import { prisma } from "../lib/prisma.js";
import { localToday } from "../lib/hours.js";
import { notify } from "../services/notify.js";

/** Campaigns past their last day are marked completed. Search already ignores them; this keeps counts and lists right. */
export async function completeCampaigns(): Promise<string> {
  const due = await prisma.sponsoredListing.findMany({
    where: { status: { in: ["active", "paused"] }, endDate: { lt: localToday() } },
    include: { category: { select: { name: true } }, provider: { select: { userId: true } } },
  });
  for (const c of due) {
    await prisma.sponsoredListing.update({ where: { id: c.id }, data: { status: "completed" } });
    void notify(c.provider.userId, "sponsored", `Your ${c.category.name} promotion has ended`, `It reached ${c.clicks} customers. See the results under Promote.`, { campaignId: Number(c.id) });
  }
  return `${due.length} completed`;
}
