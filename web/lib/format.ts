export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function whatsappHref(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function formatDistance(km: number | null): string | null {
  if (km === null || km === undefined) return null;
  if (km < 1) return `${Math.max(100, Math.round((km * 1000) / 50) * 50)} m away`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km away`;
}

const PRICE_UNIT: Record<string, string> = { per_visit: "per visit", per_hour: "per hour", fixed: "onwards" };

export function formatPrice(price: number | null, unit?: string | null): string | null {
  if (price === null || price === undefined) return null;
  const amount = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price);
  return unit ? `${amount} ${PRICE_UNIT[unit] ?? ""}`.trim() : amount;
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 864e5;
  if (diff < 60 * 60 * 1000) return "Just now";
  if (diff < day) return `${Math.floor(diff / 3.6e6)}h ago`;
  if (diff < 2 * day) return "Yesterday";
  if (diff < 30 * day) return `${Math.floor(diff / day)} days ago`;
  if (diff < 60 * day) return "1 month ago";
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))} months ago`;
  if (diff < 730 * day) return "1 year ago";
  return `${Math.floor(diff / (365 * day))} years ago`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /[A-Za-z]/.test(w[0] ?? ""))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return `${n.toLocaleString("en-IN")} ${n === 1 ? word : pluralWord}`;
}
