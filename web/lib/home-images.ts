import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";

const EXTENSIONS = ["webp", "jpg", "jpeg", "png"];

/**
 * The public URL of an optional photo dropped into public/home/ (e.g. "hero" finds hero.webp, hero.jpg...),
 * or null when there is none, so the page can fall back to its drawn design.
 */
export function homeImage(name: "hero" | "provider"): string | null {
  for (const ext of EXTENSIONS) {
    if (existsSync(path.join(process.cwd(), "public", "home", `${name}.${ext}`))) return `/home/${name}.${ext}`;
  }
  return null;
}
