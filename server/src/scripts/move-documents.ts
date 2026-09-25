/**
 * One-off: moves documents uploaded before they became private (uploads/documents/**) into the
 * private folder and rewrites the URLs stored in verifications, claims and ticket messages.
 * Safe to run more than once. Usage: pnpm --filter server move-documents
 */
import { mkdir, readdir, rename } from "node:fs/promises";
import path from "node:path";
import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";
import { PRIVATE_FILES_URL, privateDir } from "../lib/private-files.js";
import { UPLOAD_ROUTE, uploadDir } from "../storage/index.js";

const OLD_PREFIX = `${env.publicUrl}${UPLOAD_ROUTE}/documents/`;
const NEW_PREFIX = `${PRIVATE_FILES_URL}documents/`;

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(entries.map((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])));
  return nested.flat();
}

const from = path.join(uploadDir, "documents");
const files = await walk(from);
for (const file of files) {
  const target = path.join(privateDir, "documents", path.relative(from, file));
  await mkdir(path.dirname(target), { recursive: true });
  await rename(file, target);
}

const fix = (url: string | null) => (url && url.startsWith(OLD_PREFIX) ? NEW_PREFIX + url.slice(OLD_PREFIX.length) : url);
const [verifications, claims, messages] = await Promise.all([
  prisma.verification.findMany({ where: { documentUrl: { startsWith: OLD_PREFIX } }, select: { id: true, documentUrl: true } }),
  prisma.providerClaim.findMany({ where: { documentUrl: { startsWith: OLD_PREFIX } }, select: { id: true, documentUrl: true } }),
  prisma.ticketMessage.findMany({ where: { attachments: { isEmpty: false } }, select: { id: true, attachments: true } }),
]);
for (const v of verifications) await prisma.verification.update({ where: { id: v.id }, data: { documentUrl: fix(v.documentUrl) } });
for (const c of claims) await prisma.providerClaim.update({ where: { id: c.id }, data: { documentUrl: fix(c.documentUrl) } });
let changedMessages = 0;
for (const m of messages) {
  const next = m.attachments.map((a) => fix(a)!);
  if (next.some((a, i) => a !== m.attachments[i])) {
    await prisma.ticketMessage.update({ where: { id: m.id }, data: { attachments: next } });
    changedMessages++;
  }
}
console.log(`Moved ${files.length} files. Updated ${verifications.length} verifications, ${claims.length} claims, ${changedMessages} ticket messages.`);
await prisma.$disconnect();
