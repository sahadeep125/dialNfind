import type { AttributeAppliesTo, CategoryAttribute, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { badRequest } from "../lib/errors.js";

type Db = Prisma.TransactionClient | typeof prisma;
export type AttributeInput = string | number | boolean | string[] | null;

export function attributeOptions(attr: Pick<CategoryAttribute, "optionsJson">): string[] {
  return Array.isArray(attr.optionsJson) ? (attr.optionsJson as unknown[]).map(String) : [];
}

/** Attributes defined for a category, either category-wide or for the given subcategory. */
export function applicableAttributes(db: Db, appliesTo: AttributeAppliesTo, categoryId: bigint, subcategoryId: bigint | null) {
  return db.categoryAttribute.findMany({
    where: { appliesTo, categoryId, OR: [{ subcategoryId: null }, ...(subcategoryId ? [{ subcategoryId }] : [])] },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });
}

/** Validates a value against the attribute's field type and serialises it for attribute_values.value. */
export function encodeAttributeValue(attr: CategoryAttribute, raw: AttributeInput): string | null {
  if (raw === null || raw === "" || (Array.isArray(raw) && raw.length === 0)) {
    if (attr.isRequired) throw badRequest(`${attr.label} is required`);
    return null;
  }
  const options = attributeOptions(attr);
  switch (attr.fieldType) {
    case "boolean":
      if (typeof raw !== "boolean") throw badRequest(`${attr.label} must be yes or no`);
      return String(raw);
    case "number": {
      const n = Number(raw);
      if (!Number.isFinite(n)) throw badRequest(`${attr.label} must be a number`);
      return String(n);
    }
    case "select":
      if (typeof raw !== "string" || (options.length && !options.includes(raw))) throw badRequest(`Pick a valid option for ${attr.label}`);
      return raw;
    case "multiselect": {
      const list = Array.isArray(raw) ? raw.map(String) : [String(raw)];
      if (options.length && list.some((v) => !options.includes(v))) throw badRequest(`Pick valid options for ${attr.label}`);
      return JSON.stringify([...new Set(list)]);
    }
    default:
      if (typeof raw !== "string" && typeof raw !== "number") throw badRequest(`${attr.label} must be text`);
      return String(raw).trim().slice(0, 300);
  }
}

export function decodeAttributeValue(attr: Pick<CategoryAttribute, "fieldType">, value: string): AttributeInput {
  switch (attr.fieldType) {
    case "boolean":
      return value === "true";
    case "number":
      return Number(value);
    case "multiselect":
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(String) : [value];
      } catch {
        return [value];
      }
    default:
      return value;
  }
}

/** Human readable form, e.g. "Samsung, LG" or "Yes". */
export function displayAttributeValue(attr: Pick<CategoryAttribute, "fieldType">, value: string): string {
  const decoded = decodeAttributeValue(attr, value);
  if (typeof decoded === "boolean") return decoded ? "Yes" : "No";
  if (Array.isArray(decoded)) return decoded.join(", ");
  return String(decoded);
}

/** Loads values for many entities at once, keyed by entity id then attribute id. */
export async function loadAttributeValues(db: Db, entityType: "lead" | "provider_service", entityIds: bigint[]) {
  if (!entityIds.length) return new Map<bigint, { attribute: CategoryAttribute; value: string }[]>();
  const rows = await db.attributeValue.findMany({
    where: { entityType, entityId: { in: entityIds } },
    include: { attribute: true },
    orderBy: [{ attribute: { displayOrder: "asc" } }, { attributeId: "asc" }],
  });
  const map = new Map<bigint, { attribute: CategoryAttribute; value: string }[]>();
  for (const r of rows) {
    const list = map.get(r.entityId) ?? [];
    list.push({ attribute: r.attribute, value: r.value });
    map.set(r.entityId, list);
  }
  return map;
}
