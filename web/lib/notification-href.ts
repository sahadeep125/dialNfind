/** Where a notification leads, from the data the API stored with it (server/src/services/notify.ts). */
export function notificationHref(type: string, data: unknown): string | null {
  const d = (data && typeof data === "object" ? data : {}) as { providerSlug?: unknown; ticketId?: unknown };
  if (typeof d.ticketId === "number" || typeof d.ticketId === "string") return `/dashboard/support/${d.ticketId}`;
  if (type === "review_reply" && typeof d.providerSlug === "string" && d.providerSlug) return `/providers/${encodeURIComponent(d.providerSlug)}#reviews`;
  if (type === "review_reply") return "/dashboard/reviews";
  return null;
}
