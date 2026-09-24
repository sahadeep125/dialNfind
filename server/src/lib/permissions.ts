import type { NextFunction, Request, Response } from "express";
import { prisma } from "./prisma.js";
import { forbidden, unauthorized } from "./errors.js";
import { optionalAuth } from "../middleware/auth.js";

/** Admin modules. A staff member's role lists the ones they may open; the super admin has all of them. */
export const ADMIN_MODULES = [
  { key: "providers", label: "Providers and claims", description: "Approve, edit and suspend listings; handle ownership claims" },
  { key: "verifications", label: "Verification", description: "Review identity and business documents" },
  { key: "categories", label: "Categories", description: "Categories, subcategories, attributes and badges" },
  { key: "plans", label: "Plans and payments", description: "Subscription plans, subscribers and payments" },
  { key: "promotions", label: "Promotions", description: "Sponsored listings and their budgets" },
  { key: "reviews", label: "Reviews and reports", description: "Hide reviews and work through reports" },
  { key: "users", label: "Users", description: "Suspend or reactivate customer and provider accounts" },
  { key: "leads", label: "Leads", description: "See every call and WhatsApp contact" },
  { key: "support", label: "Support tickets", description: "Answer and assign support tickets" },
  { key: "notifications", label: "Announcements", description: "Send announcements to users" },
  { key: "analytics", label: "Analytics", description: "Growth, search and lead reports" },
  { key: "settings", label: "Settings and plugins", description: "Platform settings and plugin keys" },
  { key: "team", label: "Team and roles", description: "Add staff and manage roles" },
  { key: "audit", label: "Audit log", description: "See every change made in the console" },
] as const;

export type AdminModule = (typeof ADMIN_MODULES)[number]["key"];
export const MODULE_KEYS = ADMIN_MODULES.map((m) => m.key) as AdminModule[];
/** Team and roles stay with the super admin so no staff member can widen their own access. */
export const ASSIGNABLE_MODULES = ADMIN_MODULES.filter((m) => m.key !== "team");
const ASSIGNABLE_KEYS: string[] = ASSIGNABLE_MODULES.map((m) => m.key);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      permissions?: Set<AdminModule>;
    }
  }
}

/** Loads the signed-in staff member's modules. Anyone who is not super_admin or admin is refused. */
export async function requireStaff(req: Request, res: Response, next: NextFunction) {
  await optionalAuth(req, res, () => undefined);
  if (!req.user) throw unauthorized();
  if (req.user.role === "super_admin") {
    req.permissions = new Set(MODULE_KEYS);
    return next();
  }
  if (req.user.role !== "admin") throw forbidden("This account does not have admin access");
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { adminRole: { select: { permissions: true } } } });
  req.permissions = new Set((user?.adminRole?.permissions ?? []).filter((p): p is AdminModule => ASSIGNABLE_KEYS.includes(p)));
  next();
}

export function requirePermission(module: AdminModule) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.permissions) await requireStaff(req, res, () => undefined);
    if (!req.permissions?.has(module)) throw forbidden("Your role does not include this section");
    next();
  };
}

/** Maps the first path segment under /admin to the module that guards it. */
const PATH_MODULES: Record<string, AdminModule | null> = {
  me: null,
  overview: null,
  providers: "providers",
  claims: "providers",
  verifications: "verifications",
  categories: "categories",
  plans: "plans",
  transactions: "plans",
  subscriptions: "plans",
  sponsored: "promotions",
  flags: "reviews",
  reviews: "reviews",
  users: "users",
  leads: "leads",
  tickets: "support",
  "contact-messages": "support",
  notifications: "notifications",
  analytics: "analytics",
  "search-insights": "analytics",
  settings: "settings",
  team: "team",
  roles: "team",
  "activity-logs": "audit",
  badges: "categories",
};

export function guardAdminPath(req: Request, _res: Response, next: NextFunction) {
  const segment = req.path.split("/")[1] ?? "";
  const module = PATH_MODULES[segment];
  if (module === undefined) return next(); // unknown path falls through to 404
  if (module && !req.permissions?.has(module)) throw forbidden("Your role does not include this section");
  next();
}
