import { prisma } from "../lib/prisma.js";
import { notify } from "../services/notify.js";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Asks "How was X?" 1 to 3 days after a contact the customer said the business responded to, when they
 * have not reviewed it yet. Every contact is looked at once (review_prompt_sent_at), and a customer who
 * contacted the same business several times is asked once.
 */
export async function sendReviewPrompts(): Promise<string> {
  const now = Date.now();
  const leads = await prisma.lead.findMany({
    where: {
      userId: { not: null },
      customerReportedResponse: true,
      reviewPromptSentAt: null,
      review: null,
      createdAt: { gte: new Date(now - 3 * DAY), lte: new Date(now - DAY) },
    },
    orderBy: { createdAt: "asc" },
    take: 1000,
    select: {
      id: true,
      userId: true,
      providerId: true,
      user: { select: { status: true } },
      provider: { select: { slug: true, businessName: true, status: true, userId: true } },
    },
  });
  if (!leads.length) return "no contacts to follow up";

  const reviewed = await prisma.review.findMany({
    where: { OR: leads.map((l) => ({ userId: l.userId!, providerId: l.providerId })) },
    select: { userId: true, providerId: true },
  });
  const done = new Set(reviewed.map((r) => `${r.userId}:${r.providerId}`));

  let sent = 0;
  for (const lead of leads) {
    const key = `${lead.userId}:${lead.providerId}`;
    const ask = !done.has(key) && lead.user?.status === "active" && lead.provider.status === "active" && lead.provider.userId !== lead.userId;
    done.add(key);
    if (ask) {
      await notify(lead.userId, "review_prompt", `How was ${lead.provider.businessName}?`, "You said they got back to you. A quick review helps your neighbours choose.", {
        providerSlug: lead.provider.slug,
        leadId: Number(lead.id),
      });
      sent++;
    }
  }
  await prisma.lead.updateMany({ where: { id: { in: leads.map((l) => l.id) } }, data: { reviewPromptSentAt: new Date() } });
  return `${sent} review prompts sent, ${leads.length - sent} contacts skipped`;
}
