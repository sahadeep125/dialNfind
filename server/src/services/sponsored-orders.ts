import type { SponsoredOrder } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { num } from "../lib/serialize.js";
import { recordGatewayPayment } from "./billing-sync.js";
import { notify } from "./notify.js";
import { captureServer } from "./analytics.js";

/**
 * Starts the campaign a provider paid for online. Called from Checkout's success handler and from the
 * Razorpay webhook, so it must be safe to run twice. Marking the order paid and creating the campaign
 * happen in one transaction, so a failure leaves the order unpaid and the retry starts over. An order
 * left paid without a campaign (by an older version) is finished here too. The payment is recorded on
 * every call; its id is unique, so that happens once.
 */
export async function activateSponsoredOrder(order: SponsoredOrder, paymentId: string) {
  const listing = await prisma.$transaction(async (tx) => {
    // Only one caller moves the order from created to paid; a second one waits on the row lock here.
    const claimed = await tx.sponsoredOrder.updateMany({ where: { id: order.id, status: "created" }, data: { status: "paid" } });
    const current = await tx.sponsoredOrder.findUniqueOrThrow({ where: { id: order.id } });
    if (!claimed.count && (current.status !== "paid" || current.sponsoredListingId)) return null;

    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + order.days - 1);
    const created = await tx.sponsoredListing.create({
      data: { providerId: order.providerId, categoryId: order.categoryId, startDate: start, endDate: end, budget: order.budget, status: "active" },
      include: { category: { select: { name: true } } },
    });
    await tx.sponsoredOrder.update({ where: { id: order.id }, data: { sponsoredListingId: created.id } });
    return created;
  });
  await recordGatewayPayment({
    providerId: order.providerId,
    subscriptionId: null,
    gateway: "razorpay",
    paymentId,
    amount: num(order.amount) ?? 0,
    currency: "INR",
    reference: order.razorpayOrderId,
    type: "sponsored_ad",
  });
  if (listing) {
    const provider = await prisma.provider.findUnique({ where: { id: order.providerId }, select: { userId: true } });
    void notify(provider?.userId, "sponsored", "Your campaign is live", `Customers searching ${listing.category.name} now see you as Sponsored for ${order.days} days.`, {
      campaignId: Number(listing.id),
    });
    captureServer(provider?.userId, "sponsored_order_paid", {
      provider_id: Number(order.providerId),
      campaign_id: Number(listing.id),
      category: listing.category.name,
      days: order.days,
      amount: num(order.amount) ?? 0,
      currency: "INR",
    });
  }
  return prisma.sponsoredOrder.findUniqueOrThrow({ where: { id: order.id }, include: { sponsored: true } });
}
