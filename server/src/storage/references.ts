import { z } from "zod";
import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";
import { PRIVATE_FILES_ROUTE, PRIVATE_FILES_URL } from "../lib/private-files.js";
import { storage, UPLOAD_ROUTE } from "./index.js";

const PUBLIC_UPLOADS_URL = `${env.publicUrl}${UPLOAD_ROUTE}/`;

/**
 * Image fields (portfolio, review photos, profile photo, logo, cover) only take files uploaded here, so
 * every stored image went through POST /uploads (type check, re-encoding, EXIF removed) and a URL can
 * never point outside the upload folder.
 */
export const uploadedImageUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v.startsWith(PUBLIC_UPLOADS_URL) && !/[?#]|\.\./.test(v), "Upload the image again");

export const optionalUploadedImageUrl = z.union([z.literal(""), z.null(), uploadedImageUrl]).transform((v) => (v ? v : null));

/** "public:<key>" or "private:<key>" for a stored upload URL, matched on the path so a changed PUBLIC_URL still matches. */
export function uploadKey(url: string): string | null {
  const clean = url.split("?")[0];
  for (const [scope, route] of [["public", `${UPLOAD_ROUTE}/`], ["private", `${PRIVATE_FILES_ROUTE}/`]] as const) {
    const at = clean.indexOf(route);
    if (at !== -1) return `${scope}:${clean.slice(at + route.length)}`;
  }
  return null;
}

/** Every stored URL that can point at an upload. The orphan sweep and releaseFile both read this list. */
export async function allUploadUrls(): Promise<(string | null)[]> {
  const [users, providers, portfolio, reviewPhotos, categories, subcategories, badges, verifications, claims, messages] = await Promise.all([
    prisma.user.findMany({ where: { profilePhotoUrl: { not: null } }, select: { profilePhotoUrl: true } }),
    prisma.provider.findMany({ where: { OR: [{ logoUrl: { not: null } }, { coverUrl: { not: null } }] }, select: { logoUrl: true, coverUrl: true } }),
    prisma.providerPortfolio.findMany({ select: { imageUrl: true } }),
    prisma.reviewPhoto.findMany({ select: { photoUrl: true } }),
    prisma.category.findMany({ where: { iconUrl: { not: null } }, select: { iconUrl: true } }),
    prisma.subcategory.findMany({ where: { iconUrl: { not: null } }, select: { iconUrl: true } }),
    prisma.badge.findMany({ where: { iconUrl: { not: null } }, select: { iconUrl: true } }),
    prisma.verification.findMany({ where: { documentUrl: { not: null } }, select: { documentUrl: true } }),
    prisma.providerClaim.findMany({ where: { documentUrl: { not: null } }, select: { documentUrl: true } }),
    prisma.ticketMessage.findMany({ where: { attachments: { isEmpty: false } }, select: { attachments: true } }),
  ]);
  return [
    ...users.map((u) => u.profilePhotoUrl),
    ...providers.flatMap((p) => [p.logoUrl, p.coverUrl]),
    ...portfolio.map((p) => p.imageUrl),
    ...reviewPhotos.map((p) => p.photoUrl),
    ...[...categories, ...subcategories, ...badges].map((c) => c.iconUrl),
    ...[...verifications, ...claims].map((d) => d.documentUrl),
    ...messages.flatMap((m) => m.attachments),
  ];
}

/** Whether any record still points at this file. Keys end in a random UUID, so a substring match is exact enough. */
async function isReferenced(url: string): Promise<boolean> {
  const key = uploadKey(url);
  if (!key) return false;
  const path = key.slice(key.indexOf(":") + 1);
  const has = { contains: path };
  const counts = await Promise.all([
    prisma.user.count({ where: { profilePhotoUrl: has } }),
    prisma.provider.count({ where: { OR: [{ logoUrl: has }, { coverUrl: has }] } }),
    prisma.providerPortfolio.count({ where: { imageUrl: has } }),
    prisma.reviewPhoto.count({ where: { photoUrl: has } }),
    prisma.category.count({ where: { iconUrl: has } }),
    prisma.subcategory.count({ where: { iconUrl: has } }),
    prisma.badge.count({ where: { iconUrl: has } }),
    prisma.verification.count({ where: { documentUrl: has } }),
    prisma.providerClaim.count({ where: { documentUrl: has } }),
    prisma.ticketMessage.count({ where: { attachments: { has: `${PRIVATE_FILES_URL}${path}` } } }),
  ]);
  return counts.some((n) => n > 0);
}

/**
 * Deletes a file a record stopped using, unless another record still points at it. Call it after the
 * database change. Someone could otherwise save another listing's photo URL on their own record and
 * delete that record to remove the other listing's file.
 */
export async function releaseFile(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    if (await isReferenced(url)) return;
    await storage.remove(url);
  } catch (err) {
    console.error("[storage] could not release", url, err);
  }
}
