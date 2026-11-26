import type { HoursRow } from "./hours.js";

/**
 * Opening hours as one line of text, for CSV files: "Mon-Sat 10:00-20:00; Sun closed", "24x7", or
 * "Mon-Fri 09:00-18:00; Sat 10:00-14:00". Days are Mon..Sun; a day that is not mentioned is closed.
 */

// Monday first, as people write a week; values are dayOfWeek (0 = Sunday).
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const slot = (h: HoursRow | undefined) => (!h ? "closed" : h.is24x7 ? "24h" : h.openTime && h.closeTime ? `${h.openTime}-${h.closeTime}` : "closed");

/** The text for saved hours; empty when none are saved. */
export function formatHours(rows: HoursRow[]): string {
  if (!rows.length) return "";
  const byDay = new Map(rows.map((r) => [r.dayOfWeek, r]));
  const slots = WEEK.map((d) => slot(byDay.get(d)));
  if (slots.every((s) => s === "24h")) return "24x7";
  const parts: string[] = [];
  for (let i = 0; i < 7; ) {
    let j = i;
    while (j + 1 < 7 && slots[j + 1] === slots[i]) j++;
    parts.push(`${SHORT[WEEK[i]]}${j > i ? `-${SHORT[WEEK[j]]}` : ""} ${slots[i]}`);
    i = j + 1;
  }
  return parts.join("; ");
}

function dayIndex(name: string): number {
  const i = SHORT.findIndex((s) => name.toLowerCase().startsWith(s.toLowerCase()));
  return i < 0 ? -1 : WEEK.indexOf(i);
}

function time(v: string): string | null {
  const m = /^(\d{1,2})(?::|\.)?(\d{2})?$/.exec(v.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? "0");
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Reads the text back into seven day rows, or returns what is wrong with it. */
export function parseHours(text: string): { hours?: HoursRow[]; error?: string } {
  const value = text.trim();
  if (/^24\s*[x×]\s*7$/i.test(value)) return { hours: WEEK.map((d) => ({ dayOfWeek: d, openTime: null, closeTime: null, is24x7: true })) };
  const set = new Map<number, HoursRow>();
  for (const part of value.split(/[;|]/).map((p) => p.trim()).filter(Boolean)) {
    const m = /^([A-Za-z]+)(?:\s*-\s*([A-Za-z]+))?\s+(.+)$/.exec(part);
    if (!m) return { error: `hours: cannot read "${part}". Write it like "Mon-Sat 10:00-20:00; Sun closed"` };
    const from = dayIndex(m[1]);
    const to = m[2] ? dayIndex(m[2]) : from;
    if (from < 0 || to < 0 || to < from) return { error: `hours: "${part}" needs days from Mon to Sun, like Mon-Sat` };
    const when = m[3].trim().toLowerCase();
    let row: Omit<HoursRow, "dayOfWeek">;
    if (when === "closed") row = { openTime: null, closeTime: null, is24x7: false };
    else if (when === "24h" || when === "24 hours" || when === "open 24 hours") row = { openTime: null, closeTime: null, is24x7: true };
    else {
      const [a, b] = when.split(/\s*(?:-|–|to)\s*/);
      const open = a ? time(a) : null;
      const close = b ? time(b) : null;
      if (!open || !close) return { error: `hours: "${m[3]}" should be HH:MM-HH:MM in 24 hour time, closed or 24h` };
      if (close <= open) return { error: `hours: closing time must be after opening time in "${part}"` };
      row = { openTime: open, closeTime: close, is24x7: false };
    }
    for (let i = from; i <= to; i++) {
      const day = WEEK[i];
      if (set.has(day)) return { error: `hours: ${SHORT[day]} appears twice` };
      set.set(day, { dayOfWeek: day, ...row });
    }
  }
  if (!set.size) return { error: "hours: write the days and times, like Mon-Sat 10:00-20:00" };
  return { hours: WEEK.map((d) => set.get(d) ?? { dayOfWeek: d, openTime: null, closeTime: null, is24x7: false }) };
}
