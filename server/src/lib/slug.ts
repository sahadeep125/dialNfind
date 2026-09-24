import { prisma } from "./prisma.js";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function uniqueProviderSlug(businessName: string, city: string, excludeId?: bigint): Promise<string> {
  const base = slugify(`${businessName} ${city}`) || "provider";
  let candidate = base;
  for (let i = 2; ; i++) {
    const existing = await prisma.provider.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${i}`;
  }
}
