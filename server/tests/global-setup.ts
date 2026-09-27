import { execFileSync } from "node:child_process";
import os from "node:os";
import { PrismaClient } from "@prisma/client";

/**
 * Creates the test database (once) and applies every migration to it. Creating a database and the
 * postgis / pg_trgm extensions needs a superuser, so that part connects with TEST_ADMIN_DATABASE_URL
 * (the local Homebrew superuser by default); migrations then run as the app user like in production.
 */
export default async function setup() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "postgresql://dialnfind:dialnfind@localhost:5432/dialnfind_test?schema=public");
  const dbName = url.pathname.slice(1);
  const owner = decodeURIComponent(url.username);
  const adminUrl = process.env.TEST_ADMIN_DATABASE_URL ?? `postgresql://${os.userInfo().username}@localhost:5432/postgres`;

  const admin = new PrismaClient({ datasourceUrl: adminUrl });
  const exists = await admin.$queryRaw<unknown[]>`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
  if (exists.length === 0) await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}" OWNER "${owner}"`);
  await admin.$disconnect();

  const adminOnTest = new URL(adminUrl);
  adminOnTest.pathname = `/${dbName}`;
  const ext = new PrismaClient({ datasourceUrl: adminOnTest.toString() });
  await ext.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS postgis`);
  await ext.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  await ext.$disconnect();

  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url.toString() },
  });
}
