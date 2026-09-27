/**
 * Diagnostics for developers. console.error / console.warn open React Native's LogBox bar at the
 * bottom of the screen in development; anything a person needs to know is shown with useToast()
 * instead, so these go to the Metro log only. Release builds stay quiet: errors worth knowing about go
 * to crash reporting, not the device log.
 */
export function logError(...args: unknown[]): void {
  if (__DEV__) console.log("ERROR", ...args);
}

export function logWarn(...args: unknown[]): void {
  if (__DEV__) console.log("WARN", ...args);
}
