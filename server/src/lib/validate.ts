import type { z } from "zod";
import { badRequest } from "./errors.js";

export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    throw badRequest(fields[0] ? `${fields[0].path || "input"}: ${fields[0].message}` : "Invalid input", fields);
  }
  return result.data;
}

export function idParam(value: unknown): bigint {
  if (typeof value !== "string") throw badRequest("Invalid id");
  if (!/^\d+$/.test(value)) throw badRequest("Invalid id");
  return BigInt(value);
}
