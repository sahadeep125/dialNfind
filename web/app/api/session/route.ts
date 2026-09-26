import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";

/**
 * GET /api/session — who is signed in and how many notifications they have not read. Pages are
 * cached for everyone, so the header asks for this from the browser.
 */
export async function GET() {
  const user = await getSession();
  let unread = 0;
  if (user) {
    const data = await api<{ unread: number }>("/me/notifications").catch(() => null);
    unread = data?.unread ?? 0;
  }
  return NextResponse.json({ user, unread }, { headers: { "cache-control": "private, no-store" } });
}
