import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

const TAG = /^[a-z0-9:_-]{1,200}$/;
const MAX_TAGS = 50;

function secretMatches(given: string | null): boolean {
  const secret = process.env.REVALIDATE_SECRET ?? "";
  if (!secret || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * POST /api/revalidate — the API calls this after it changes data that public pages are cached from
 * (server/src/services/web-cache.ts), so the next visit renders fresh data instead of waiting out the TTL.
 */
export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("x-revalidate-secret"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags) ? body.tags : null;
  if (!tags || tags.length === 0 || tags.length > MAX_TAGS || !tags.every((t): t is string => typeof t === "string" && TAG.test(t))) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  for (const tag of new Set(tags)) revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ ok: true, revalidated: tags.length });
}
