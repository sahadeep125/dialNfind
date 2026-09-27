/**
 * Diagnostics for developers. console.error / console.warn open React Native's LogBox bar at the
 * bottom of the screen in development; anything a person needs to know is shown with useToast()
 * instead, so these go to the Metro log only.
 */
export function logError(...args: unknown[]): void {
  console.log("ERROR", ...args);
}

export function logWarn(...args: unknown[]): void {
  console.log("WARN", ...args);
}
