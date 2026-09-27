import { mkdir, rm } from "node:fs/promises";
import { afterAll, afterEach, beforeEach, vi } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { clearSettingsCache } from "../src/services/settings.js";
import { resetDb } from "./helpers/db.js";


// Nothing in the test suite may reach the network: every outbound call is stubbed by the test that needs it.
const unmockedFetch = vi.fn(async (input: unknown) => {
  throw new Error(`Unmocked fetch: ${String(input instanceof Request ? input.url : input)}`);
});

beforeEach(async () => {
  vi.stubGlobal("fetch", unmockedFetch);
  // Quiet, but inspectable: tests read printed emails and logged errors from these spies.
  for (const level of ["info", "warn", "error"] as const) vi.spyOn(console, level).mockImplementation(() => undefined);
  clearSettingsCache();
  for (const dir of [process.env.UPLOAD_DIR!, process.env.UPLOAD_PRIVATE_DIR!]) {
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
  }
  await resetDb();
});

afterEach(async () => {
  vi.useRealTimers();
  // Fire-and-forget work (notifications, emails) finishes before the next test empties the tables.
  await new Promise((r) => setTimeout(r, 25));
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});
