import { Prisma } from "@prisma/client";

/**
 * Converts Prisma values into JSON-friendly ones: BigInt ids and Decimal columns become numbers,
 * Dates become ISO strings. Applied to every response body by the json middleware.
 */
export function toPlain(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (Prisma.Decimal.isDecimal(value)) return Number((value as Prisma.Decimal).toString());
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = toPlain(v);
    }
    return out;
  }
  return value;
}

export const num = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") return Number(v);
  if (Prisma.Decimal.isDecimal(v)) return Number((v as Prisma.Decimal).toString());
  return Number(v);
};
