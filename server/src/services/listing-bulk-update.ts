import type { Prisma, Provider } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { badRequest } from "../lib/errors.js";
import { parseCsv } from "../lib/csv.js";
import { normalizePhone } from "../lib/rules.js";
import type { HoursRow } from "../lib/hours.js";
import { formatHours, parseHours } from "../lib/hours-text.js";
import { replaceHours } from "../routes/provider/shared.js";
import { recalculateProvider } from "./ranking.js";
import { searchPlaces } from "./geocode.js";
import { adminListingProfileSchema, updateListingProfile } from "./listings.js";
import { assertTypeChangeAllowed } from "./professions.js";
import { logAdmin } from "./audit.js";

/**
 * Bulk update of existing listings from a CSV. The admin downloads the current details (the same columns
 * as below, one row per listing), edits what needs changing and uploads the file. Each row is matched by
 * its id, or by phone when the id is blank. Empty cells keep the current value, "-" clears an optional
 * one, and only values that differ from the listing are saved, through the same path as the admin editor.
 */

type ProfileInput = Partial<Record<keyof typeof adminListingProfileSchema.shape, unknown>>;

interface Column {
  column: string;
  field: keyof typeof adminListingProfileSchema.shape;
  kind: "text" | "int" | "number" | "bool" | "type";
  /** "-" sets the field to null. */
  clearable?: boolean;
}

const COLUMNS: Column[] = [
  { column: "business_name", field: "businessName", kind: "text" },
  // "individual" (an independent professional, business_name is their name) or "business".
  { column: "account_type", field: "businessType", kind: "type" },
  { column: "profession", field: "profession", kind: "text", clearable: true },
  { column: "phone", field: "phone", kind: "text" },
  { column: "whatsapp", field: "whatsappNumber", kind: "text", clearable: true },
  { column: "email", field: "email", kind: "text", clearable: true },
  { column: "website", field: "website", kind: "text", clearable: true },
  { column: "description", field: "description", kind: "text", clearable: true },
  { column: "years_experience", field: "yearsExperience", kind: "int", clearable: true },
  { column: "address", field: "addressLine", kind: "text", clearable: true },
  { column: "locality", field: "locality", kind: "text", clearable: true },
  { column: "city", field: "city", kind: "text" },
  { column: "state", field: "state", kind: "text" },
  { column: "pincode", field: "pincode", kind: "text", clearable: true },
  { column: "latitude", field: "latitude", kind: "number" },
  { column: "longitude", field: "longitude", kind: "number" },
  { column: "service_radius_km", field: "serviceRadiusKm", kind: "int" },
  { column: "accepts_calls", field: "acceptsCalls", kind: "bool" },
  { column: "accepts_whatsapp", field: "acceptsWhatsapp", kind: "bool" },
  { column: "available", field: "isAvailable", kind: "bool" },
  { column: "seo_title", field: "seoTitle", kind: "text", clearable: true },
  { column: "seo_description", field: "seoDescription", kind: "text", clearable: true },
  { column: "focus_keyword", field: "focusKeyword", kind: "text", clearable: true },
  { column: "hidden_from_search", field: "seoNoIndex", kind: "bool" },
];

/**
 * The header of the bulk update file: the listing id, every profile column that can be updated, the
 * opening hours (see hours-text.ts), and the services, which are shown for reference and never read.
 */
export const UPDATE_COLUMNS = ["id", ...COLUMNS.map((c) => c.column), "hours", "services"];
const READ_ONLY = new Set(["services"]);

/** What the download and the update read for each listing. */
export const updateInclude = {
  businessHours: { orderBy: { dayOfWeek: "asc" } },
  services: { orderBy: [{ isPrimary: "desc" }, { id: "asc" }], include: { category: { select: { name: true } }, subcategory: { select: { name: true } } } },
} satisfies Prisma.ProviderInclude;
type UpdateProvider = Prisma.ProviderGetPayload<{ include: typeof updateInclude }>;
const ADDRESS_COLUMNS = ["address", "locality", "city", "state", "pincode"];
const MAX_ROWS = 500;
const CLEAR = "-";

/** How a value reads in the file, so the current and the uploaded value compare as equal text. */
function show(kind: Column["kind"], value: unknown): string {
  if (value === null || value === undefined) return "";
  if (kind === "bool") return value ? "yes" : "no";
  if (kind === "type") return value === "individual" ? "individual" : "business";
  if (kind === "number" || kind === "int") return String(Number(value));
  return String(value);
}

/** One row of the download: the listing's current values in UPDATE_COLUMNS order. */
export function currentValues(p: UpdateProvider): unknown[] {
  const services = p.services.map((s) => (s.subcategory ? `${s.category.name} / ${s.subcategory.name}` : s.category.name)).join("; ");
  return [p.id, ...COLUMNS.map((c) => show(c.kind, p[c.field as keyof Provider])), formatHours(p.businessHours), services];
}

/** A cell as the admin meant it: spreadsheets keep the ' our exports add before + and - (see csvLine). */
const cell = (v: string | undefined) => (v ?? "").trim().replace(/^'(?=[=+\-@])/, "");

function parseValue(c: Column, raw: string): { value?: unknown; error?: string } {
  if (raw === CLEAR) return c.clearable ? { value: null } : { error: `${c.column} cannot be cleared` };
  switch (c.kind) {
    case "int":
    case "number": {
      const n = Number(raw);
      if (!Number.isFinite(n) || (c.kind === "int" && !Number.isInteger(n))) return { error: `${c.column}: "${raw}" is not a ${c.kind === "int" ? "whole number" : "number"}` };
      return { value: n };
    }
    case "bool": {
      const v = raw.toLowerCase();
      if (["yes", "y", "true", "1"].includes(v)) return { value: true };
      if (["no", "n", "false", "0"].includes(v)) return { value: false };
      return { error: `${c.column} must be yes or no, not "${raw}"` };
    }
    case "type": {
      const v = raw.toLowerCase();
      if (v === "individual") return { value: "individual" };
      if (v === "business" || v === "company") return { value: "company" };
      return { error: `account_type must be "individual" or "business", not "${raw}"` };
    }
    default:
      return { value: raw };
  }
}

export interface UpdateChange {
  column: string;
  from: string;
  to: string;
}

export interface UpdateRow {
  row: number;
  id: number | null;
  businessName: string;
  status: "update" | "unchanged" | "error";
  errors: string[];
  warnings: string[];
  changes: UpdateChange[];
  geocoded: boolean;
}

interface PlannedRow extends UpdateRow {
  provider?: UpdateProvider;
  data?: ProfileInput;
  hours?: HoursRow[];
}

export async function bulkUpdateListings(csv: string, options: { dryRun: boolean; adminId: bigint }) {
  const [header, ...lines] = parseCsv(csv);
  if (!header) throw badRequest("The file is empty");
  const columns = header.map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  if (!columns.includes("id") && !columns.includes("phone")) throw badRequest("Add an id or phone column so each row can be matched to a listing. Download the current data to get the expected header.");
  if (lines.length > MAX_ROWS) throw badRequest(`Update at most ${MAX_ROWS} rows at a time`);
  const known = new Set(UPDATE_COLUMNS);
  const ignoredColumns = [...new Set(columns.filter((c) => c && !known.has(c) && !READ_ONLY.has(c)))];
  const used = COLUMNS.filter((c) => columns.includes(c.column));

  const rawRows = lines.map((values) => (c: string) => (columns.includes(c) ? cell(values[columns.indexOf(c)]) : ""));
  const ids = rawRows.map((get) => get("id")).filter((v) => /^\d+$/.test(v)).map(BigInt);
  const phones = rawRows.map((get) => (get("id") ? null : normalizePhone(get("phone")))).filter((v): v is string => !!v);
  const providers = await prisma.provider.findMany({ where: { OR: [{ id: { in: ids } }, { phone: { in: phones } }] }, include: updateInclude });
  const byId = new Map(providers.map((p) => [p.id, p]));

  // Phones already in use, to stop two listings ending up with the same number.
  const phoneOwners = new Map<string, bigint>();
  const proposedPhones = rawRows.map((get) => normalizePhone(get("phone"))).filter((v): v is string => !!v);
  for (const p of await prisma.provider.findMany({ where: { phone: { in: proposedPhones } }, select: { id: true, phone: true } })) phoneOwners.set(p.phone, p.id);

  const seen = new Map<bigint, number>();
  const rows: PlannedRow[] = [];
  for (const [i, get] of rawRows.entries()) {
    const out: PlannedRow = { row: i + 2, id: null, businessName: get("business_name"), status: "error", errors: [], warnings: [], changes: [], geocoded: false };
    rows.push(out);

    // Match the row to a listing.
    let provider: UpdateProvider | undefined;
    const idCell = get("id");
    if (idCell) {
      if (!/^\d+$/.test(idCell)) out.errors.push(`"${idCell}" is not a listing id`);
      else if (!(provider = byId.get(BigInt(idCell)))) out.errors.push(`No listing with id ${idCell}`);
    } else {
      const phone = normalizePhone(get("phone"));
      const matches = phone ? providers.filter((p) => p.phone === phone) : [];
      if (!get("phone")) out.errors.push("Add the listing id or its phone number");
      else if (!phone) out.errors.push(`"${get("phone")}" is not a valid phone number`);
      else if (!matches.length) out.errors.push(`No listing with phone ${phone}`);
      else if (matches.length > 1) out.errors.push(`${matches.length} listings share ${phone}; add the id to pick one`);
      else provider = matches[0];
    }
    if (!provider) continue;
    out.id = Number(provider.id);
    out.businessName = provider.businessName;
    const earlier = seen.get(provider.id);
    if (earlier) {
      out.errors.push(`This listing is already updated on row ${earlier}`);
      continue;
    }
    seen.set(provider.id, out.row);

    // Read the cells. When the row was matched by phone, the phone cell is the key, not a new value.
    const input: ProfileInput = {};
    for (const c of used) {
      if (c.column === "phone" && !idCell) continue;
      const raw = get(c.column);
      if (!raw) continue;
      const { value, error } = parseValue(c, raw);
      if (error) out.errors.push(error);
      else input[c.field] = value;
    }
    let hours: HoursRow[] | undefined;
    const hoursCell = get("hours");
    if (hoursCell) {
      const parsedHours = hoursCell === CLEAR ? { hours: [] } : parseHours(hoursCell);
      if (parsedHours.error) out.errors.push(parsedHours.error);
      else hours = parsedHours.hours;
    }
    if (out.errors.length) continue;

    const parsed = adminListingProfileSchema.partial().safeParse(input);
    if (!parsed.success) {
      for (const issue of parsed.error.issues.slice(0, 3)) {
        const column = COLUMNS.find((c) => c.field === issue.path[0])?.column ?? "row";
        out.errors.push(`${column}: ${issue.message}`);
      }
      continue;
    }

    // Keep only what actually changes.
    const data: ProfileInput = {};
    for (const c of used) {
      if (!(c.field in parsed.data)) continue;
      const next = (parsed.data as Record<string, unknown>)[c.field];
      const from = show(c.kind, provider[c.field as keyof Provider]);
      const to = show(c.kind, next);
      if (from === to) continue;
      data[c.field] = next;
      out.changes.push({ column: c.column, from, to });
    }

    if (hours) {
      const from = formatHours(provider.businessHours);
      const to = formatHours(hours);
      if (from !== to) out.changes.push({ column: "hours", from, to });
      else hours = undefined;
    }

    // Only individual professionals carry a profession title (see updateListingProfile).
    if ("profession" in data && (data.businessType ?? provider.businessType) !== "individual") {
      delete data.profession;
      out.changes = out.changes.filter((ch) => ch.column !== "profession");
      out.warnings.push("profession is only for individual professionals, so it was left out");
    }

    // A new address without coordinates moves the pin there; with the old coordinates it stays put.
    const addressChanged = out.changes.some((ch) => ADDRESS_COLUMNS.includes(ch.column));
    const pinChanged = out.changes.some((ch) => ch.column === "latitude" || ch.column === "longitude");
    if (addressChanged && !pinChanged) {
      if (!get("latitude") && !get("longitude")) {
        const after = (column: string, current: string | null) => (out.changes.find((ch) => ch.column === column)?.to ?? current ?? "");
        const query = [after("address", provider.addressLine), after("locality", provider.locality), after("city", provider.city), after("state", provider.state), after("pincode", provider.pincode)].filter(Boolean).join(", ");
        const [place] = await searchPlaces(query, 1);
        if (place) {
          data.latitude = place.latitude;
          data.longitude = place.longitude;
          out.geocoded = true;
          out.changes.push({ column: "latitude", from: show("number", provider.latitude), to: show("number", place.latitude) }, { column: "longitude", from: show("number", provider.longitude), to: show("number", place.longitude) });
        } else out.warnings.push("The new address could not be found on the map, so the pin stays where it was");
      } else out.warnings.push("The address changes but the map pin does not. Clear latitude and longitude to place it from the new address");
    }

    if (typeof data.phone === "string") {
      const owner = phoneOwners.get(data.phone);
      if (owner !== undefined && owner !== provider.id) out.errors.push(`Another listing already uses ${data.phone}`);
      else phoneOwners.set(data.phone, provider.id);
    }
    if (data.businessType) {
      try {
        await assertTypeChangeAllowed(provider, data.businessType as "individual" | "company");
      } catch (err) {
        out.errors.push(err instanceof Error ? err.message : "The account type cannot change");
      }
    }
    if (out.errors.length) {
      out.changes = [];
      continue;
    }
    out.status = out.changes.length ? "update" : "unchanged";
    if (out.changes.length) {
      out.provider = provider;
      out.data = data;
      out.hours = hours;
    }
  }

  let updated = 0;
  if (!options.dryRun) {
    for (const r of rows) {
      if (!r.provider || !r.data) continue;
      const { businessHours: _h, services: _s, ...provider } = r.provider;
      const hours = r.hours;
      try {
        if (hours) await prisma.$transaction((tx) => replaceHours(tx, provider.id, hours));
        // updateListingProfile recalculates the listing; hours alone need it done here.
        if (Object.keys(r.data).length) await updateListingProfile(provider, r.data as Parameters<typeof updateListingProfile>[1]); // values come from the schema's output
        else await recalculateProvider(provider.id);
        await logAdmin(options.adminId, "provider.edit", "provider", provider.id, { fields: [...Object.keys(r.data), ...(hours ? ["hours"] : [])], via: "csv" });
        updated++;
      } catch (err) {
        r.status = "error";
        r.errors.push(err instanceof Error ? err.message : "Could not save this row");
      }
    }
    await logAdmin(options.adminId, "provider.bulk_update", "provider", undefined, { rows: rows.length, updated });
  }

  return {
    dryRun: options.dryRun,
    total: rows.length,
    toUpdate: rows.filter((r) => r.status === "update").length,
    unchanged: rows.filter((r) => r.status === "unchanged").length,
    failed: rows.filter((r) => r.status === "error").length,
    updated,
    ignoredColumns,
    rows: rows.map(({ provider: _p, data: _d, hours: _h, ...r }) => r),
  };
}
