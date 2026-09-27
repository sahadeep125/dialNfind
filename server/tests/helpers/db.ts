import { prisma } from "../../src/lib/prisma.js";

let tables: string[] | null = null;

/** Empties every application table (not PostGIS's spatial_ref_sys or Prisma's migration log). */
export async function resetDb() {
  if (!tables) {
    const rows = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', 'spatial_ref_sys')`;
    tables = rows.map((r) => `"public"."${r.tablename}"`);
  }
  if (tables.length) await prisma.$executeRawUnsafe(`TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE`);
}
