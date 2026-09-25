// Sign in with Apple on Android returns to the app through <scheme>://auth/apple. That link belongs
// to the open auth session (services/socialAuth.ts), not to a screen, so the router ignores it.
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string | null {
  try {
    if (path.includes("auth/apple")) return initial ? "/login" : null;
    return path;
  } catch {
    return initial ? "/" : null;
  }
}
