import { env } from "../env.js";

export interface HoursRow {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  is24x7: boolean;
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Current day-of-week (0 = Sunday) and "HH:MM" in the platform timezone. */
export function localNow(date = new Date()): { day: number; time: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: env.timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const hour = get("hour") === "24" ? "00" : get("hour");
  return { day, time: `${hour}:${get("minute")}` };
}

/** Today's calendar date in the platform timezone, as UTC midnight, to compare with @db.Date columns. */
export function localToday(offsetDays = 0, date = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: env.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const day = new Date(`${ymd}T00:00:00.000Z`);
  day.setUTCDate(day.getUTCDate() + offsetDays);
  return day;
}

function openAt(row: HoursRow | undefined, time: string): boolean {
  if (!row) return false;
  if (row.is24x7) return true;
  if (!row.openTime || !row.closeTime) return false;
  if (row.closeTime > row.openTime) return time >= row.openTime && time < row.closeTime;
  // Overnight window, e.g. 20:00 - 02:00
  return time >= row.openTime || time < row.closeTime;
}

export function isOpenNow(hours: HoursRow[], date = new Date()): boolean {
  if (hours.length === 0) return false;
  if (hours.some((h) => h.is24x7)) return true;
  const { day, time } = localNow(date);
  const today = hours.find((h) => h.dayOfWeek === day);
  if (openAt(today, time)) return true;
  // Still inside yesterday's overnight window?
  const yesterday = hours.find((h) => h.dayOfWeek === (day + 6) % 7);
  return !!(yesterday?.openTime && yesterday.closeTime && yesterday.closeTime < yesterday.openTime && time < yesterday.closeTime);
}

function fmt(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatHours(row: HoursRow | undefined): string {
  if (!row) return "Closed";
  if (row.is24x7) return "Open 24 hours";
  if (!row.openTime || !row.closeTime) return "Closed";
  return `${fmt(row.openTime)} - ${fmt(row.closeTime)}`;
}

export function todayHoursLabel(hours: HoursRow[], date = new Date()): string {
  if (hours.some((h) => h.is24x7)) return "Open 24 hours";
  const { day } = localNow(date);
  return formatHours(hours.find((h) => h.dayOfWeek === day));
}
