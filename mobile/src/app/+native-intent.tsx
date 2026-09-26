import { mapWebPath } from "@/utils/links";

// Sign in with Apple on Android returns to the app through <scheme>://auth/apple. That link belongs
// to the open auth session (services/socialAuth.ts), not to a screen, so the router ignores it.
// Links to the website (universal links / app links) are turned into app routes by mapWebPath.
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string | null {
  try {
    if (path.includes("auth/apple")) return initial ? "/login" : null;
    return mapWebPath(path);
  } catch {
    return initial ? "/" : null;
  }
}
