/** GST state codes (first two digits of a GSTIN), keyed by state or union territory name. */
export const GST_STATE_CODES: Record<string, string> = {
  "Jammu and Kashmir": "01", "Himachal Pradesh": "02", Punjab: "03", Chandigarh: "04", Uttarakhand: "05", Haryana: "06",
  Delhi: "07", Rajasthan: "08", "Uttar Pradesh": "09", Bihar: "10", Sikkim: "11", "Arunachal Pradesh": "12", Nagaland: "13",
  Manipur: "14", Mizoram: "15", Tripura: "16", Meghalaya: "17", Assam: "18", "West Bengal": "19", Jharkhand: "20",
  Odisha: "21", Chhattisgarh: "22", "Madhya Pradesh": "23", Gujarat: "24", "Dadra and Nagar Haveli and Daman and Diu": "26",
  Maharashtra: "27", Karnataka: "29", Goa: "30", Lakshadweep: "31", Kerala: "32", "Tamil Nadu": "33", Puducherry: "34",
  "Andaman and Nicobar Islands": "35", Telangana: "36", "Andhra Pradesh": "37", Ladakh: "38",
};

const byCode = new Map(Object.entries(GST_STATE_CODES).map(([name, code]) => [code, name]));

export const stateName = (code: string | null | undefined) => (code ? byCode.get(code) ?? null : null);

/** The GST state code for a free-text state name, ignoring case and "&". */
export function stateCodeFor(name: string | null | undefined): string | null {
  if (!name) return null;
  const key = name.trim().toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ");
  for (const [state, code] of Object.entries(GST_STATE_CODES)) if (state.toLowerCase() === key) return code;
  return null;
}

export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Indian financial year label for a date, e.g. "2026-27" for 25 Sep 2026. */
export function financialYear(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "numeric" }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value);
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Splits a GST-inclusive total into taxable value and CGST+SGST (same state) or IGST. */
export function splitGst(total: number, ratePct: number, intraState: boolean) {
  const taxable = round2(total / (1 + ratePct / 100));
  const tax = round2(total - taxable);
  if (intraState) {
    const cgst = round2(tax / 2);
    return { taxable, cgst, sgst: round2(tax - cgst), igst: 0 };
  }
  return { taxable, cgst: 0, sgst: 0, igst: tax };
}
