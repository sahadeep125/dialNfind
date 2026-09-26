"use server";

import { updateTag } from "next/cache";

/** Rebuilds a cached profile straight away after the visitor changed it (a new or edited review). */
export async function refreshProvider(slug: string) {
  if (!/^[a-z0-9-]{1,200}$/.test(slug)) return;
  updateTag(`provider:${slug}`);
}
