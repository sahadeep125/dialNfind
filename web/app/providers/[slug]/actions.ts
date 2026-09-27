"use server";

import { updateTag } from "next/cache";
import { getSession } from "@/lib/session";

/**
 * Rebuilds a cached profile straight away after the visitor changed it (a new or edited review). Only for
 * signed-in visitors, since server actions can be called by anyone and each call throws away the cached page.
 */
export async function refreshProvider(slug: string) {
  if (!/^[a-z0-9-]{1,200}$/.test(slug)) return;
  if (!(await getSession())) return;
  updateTag(`provider:${slug}`);
}
