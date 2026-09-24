import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../env.js";

/**
 * Where uploaded files live. Local disk is the default because no cloud credentials exist yet;
 * an S3 (or R2, GCS) implementation only needs to provide these two methods and be returned from
 * createStorage() when its env vars are set.
 */
export interface Storage {
  /** Saves the bytes and returns the public URL the file is served from. */
  put(key: string, data: Buffer, contentType: string): Promise<string>;
  /** Removes a file previously returned by put(); unknown URLs are ignored. */
  remove(url: string): Promise<void>;
}

export const UPLOAD_ROUTE = "/uploads";
export const uploadDir = path.resolve(env.uploadDir);

class LocalDiskStorage implements Storage {
  async put(key: string, data: Buffer) {
    const file = path.join(uploadDir, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
    return `${env.publicUrl}${UPLOAD_ROUTE}/${key}`;
  }

  async remove(url: string) {
    const prefix = `${env.publicUrl}${UPLOAD_ROUTE}/`;
    if (!url.startsWith(prefix)) return;
    const file = path.resolve(uploadDir, url.slice(prefix.length));
    if (!file.startsWith(uploadDir + path.sep)) return; // never leave the upload folder
    await unlink(file).catch(() => undefined);
  }
}

export function createStorage(): Storage {
  return new LocalDiskStorage();
}

export const storage = createStorage();

/** Builds a collision-free key like "portfolio/2026/09/3f2c...e1.webp". */
export function storageKey(folder: string, ext: string) {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${folder}/${now.getUTCFullYear()}/${month}/${randomUUID()}.${ext}`;
}
