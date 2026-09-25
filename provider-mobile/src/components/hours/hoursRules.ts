// Weekly hours helpers. Times are "HH:MM" 24-hour strings, as the API stores them.

import type { Hours, SelectOption } from "@/types";

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Monday first, as people read a working week. */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const DEFAULT_OPEN = "09:00";
export const DEFAULT_CLOSE = "20:00";

const closed = (dayOfWeek: number): Hours => ({
  dayOfWeek,
  openTime: null,
  closeTime: null,
  is24x7: false,
});

/** Used when the provider has never set hours: Monday to Saturday 9 AM to 8 PM, Sunday closed. */
export const DEFAULT_HOURS: Hours[] = DAYS.map((_, d) =>
  d === 0
    ? closed(0)
    : { dayOfWeek: d, openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE, is24x7: false },
);

/** Exactly seven rows, Sunday (0) to Saturday (6), with only the fields the API accepts. */
export function normalizeHours(hours: Hours[]): Hours[] {
  return DAYS.map((_, d) => {
    const h = hours.find((x) => x.dayOfWeek === d);
    return h
      ? { dayOfWeek: d, openTime: h.openTime, closeTime: h.closeTime, is24x7: h.is24x7 }
      : closed(d);
  });
}

/** Per-day problems keyed by dayOfWeek. Empty when every open day has a valid range. */
export function validateHours(value: Hours[]): Record<number, string> {
  const errors: Record<number, string> = {};
  for (const h of value) {
    if (h.is24x7) continue;
    if (!h.openTime !== !h.closeTime) errors[h.dayOfWeek] = "Set both opening and closing times";
    else if (h.openTime && h.closeTime && h.closeTime <= h.openTime)
      errors[h.dayOfWeek] = "Closing time must be after opening time";
  }
  return errors;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

const HALF_HOURS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  return `${h}:${i % 2 ? "30" : "00"}`;
});

/**
 * Choices in 30-minute steps. Closing times also offer 11:59 PM for late shops. A saved time that
 * is off the grid (for example 08:15) is kept in the list so it still shows.
 */
export function timeOptions(
  kind: "open" | "close",
  current: string | null,
): SelectOption<string>[] {
  const times = kind === "close" ? [...HALF_HOURS.slice(1), "23:59"] : [...HALF_HOURS];
  if (current && !times.includes(current)) times.push(current);
  return times.sort().map((t) => ({ value: t, label: formatTime(t) }));
}
