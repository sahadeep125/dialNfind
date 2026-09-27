import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { privateDir } from "../lib/private-files.js";
import { uploadDir } from "../storage/index.js";
import { allUploadUrls, uploadKey } from "../storage/references.js";

const GRACE_MS = 48 * 60 * 60 * 1000;

/** Every upload some record still points at, as "public:<key>" or "private:<key>". */
async function referencedKeys(): Promise<Set<string>> {
  const keys = new Set<string>();
  for (const url of await allUploadUrls()) {
    const key = url && uploadKey(url);
    if (key) keys.add(key);
  }
  return keys;
}

async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true }).catch(() => []);
  return entries.filter((e) => e.isFile() && !e.name.startsWith(".")).map((e) => path.join(e.parentPath, e.name));
}

/**
 * Deletes uploads that no record points at: files picked on a form that was never saved, replaced twice
 * before saving, and anything a delete path missed. Files younger than 48 hours are left alone because
 * someone may still be filling in the form. DRY_RUN=1 only reports.
 */
export async function sweepOrphanFiles(): Promise<string> {
  const dryRun = process.env.DRY_RUN === "1";
  const keys = await referencedKeys();
  const cutoff = Date.now() - GRACE_MS;
  let aged = 0;
  const orphans: { file: string; size: number }[] = [];
  for (const [scope, root] of [["public", uploadDir], ["private", privateDir]] as const) {
    for (const file of await listFiles(root)) {
      const info = await stat(file);
      if (info.mtimeMs > cutoff) continue;
      aged++;
      const key = path.relative(root, file).split(path.sep).join("/");
      if (!keys.has(`${scope}:${key}`)) orphans.push({ file, size: info.size });
    }
  }
  // If most old files look unused, something is off (wrong UPLOAD_DIR, a new upload column not listed above): stop.
  if (aged >= 20 && orphans.length > aged / 2) {
    return `orphan sweep skipped: ${orphans.length} of ${aged} files look unused, which is suspicious`;
  }
  const mb = (orphans.reduce((sum, o) => sum + o.size, 0) / 1024 / 1024).toFixed(1);
  if (dryRun) {
    for (const o of orphans) console.info(`[orphan-files] would remove ${o.file}`);
    return `${orphans.length} orphan files (${mb} MB) would be removed`;
  }
  for (const o of orphans) await unlink(o.file).catch(() => undefined);
  return `${orphans.length} orphan files (${mb} MB) removed`;
}
