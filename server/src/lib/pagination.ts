import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export function pageMeta(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Admin listings let the operator choose up to 100 rows a page (the per-page dropdown offers 10, 25, 50 and 100). */
export const adminPaginationSchema = paginationSchema.extend({
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
});
