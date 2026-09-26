import type { SponsoredOrder } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { num } from "../lib/serialize.js";
import { recordGatewayPayment } from "./billing-sync.js";
import { notify } from "./notify.js";

/**
 * Starts the campaign a provider paid for online. Called from Checkout's success handler and from the
 * Razorpay webhook, so it must be safe to run twice: the order row is claimed atomically and the
 * payment is recorded once (its id is unique).
 */
export async function activateSponsoredOrder(order: SponsoredOrder, paymentId: string) {
  // Claim the order: only one caller moves it from created to paid.
  const claimed = await prisma.sponsoredOrder.updateMany({ where: { id: order.id, status: "created" }, data: { status: "paid" } });
  if (!claimed.count) return prisma.sponsoredOrder.findUniqueOrThrow({ where: { id: order.id }, include: { sponsored: true } });

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + order.days - 1);
  const listing = await prisma.sponsoredListing.create({
    data: { providerId: order.providerId, categoryId: order.categoryId, startDate: start, endDate: end, budget: order.budget, status: "active" },
    include: { category: { select: { name: true } } },
  });
  await prisma.sponsoredOrder.update({ where: { id: order.id }, data: { sponsoredListingId: listing.id } });
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
  const provider = await prisma.provider.findUnique({ where: { id: order.providerId }, select: { userId: true } });
  void notify(provider?.userId, "sponsored", "Your campaign is live", `Customers searching ${listing.category.name} now see you as Sponsored for ${order.days} days.`, {
    campaignId: Number(listing.id),
  });
  return prisma.sponsoredOrder.findUniqueOrThrow({ where: { id: order.id }, include: { sponsored: true } });
}
