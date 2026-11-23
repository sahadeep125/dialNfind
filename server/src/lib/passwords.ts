import { randomBytes } from "node:crypto";

/** A one-off password for an account the team sets up: 12 characters, always with a letter and a digit so it passes the password rule. */
export function temporaryPassword() {
  return `${randomBytes(6).toString("base64url").replace(/[-_]/g, "x").slice(0, 8)}a${Math.floor(100 + Math.random() * 900)}`;
}
