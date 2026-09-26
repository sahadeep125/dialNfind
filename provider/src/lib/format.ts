export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return phone;
}

/** tel: and WhatsApp links for a stored number (+91XXXXXXXXXX). */
export const telLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
export const whatsappLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

export function formatPrice(n: number | null | undefined) {
  if (n === null || n === undefined) return "";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = 60_000;
  const day = 864e5;
  if (diff < min) return "Just now";
  if (diff < 60 * min) return `${Math.floor(diff / min)} min ago`;
  if (diff < day) return `${Math.floor(diff / 3.6e6)}h ago`;
  if (diff < 2 * day) return "Yesterday";
  if (diff < 30 * day) return `${Math.floor(diff / day)} days ago`;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /[A-Za-z]/.test(w[0] ?? ""))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const PRICE_UNITS = [
  { value: "per_visit", label: "Per visit" },
  { value: "per_hour", label: "Per hour" },
  { value: "fixed", label: "Fixed / starting" },
] as const;
