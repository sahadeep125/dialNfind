import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { idParam, parse } from "../../lib/validate.js";
import { badRequest, conflict, notFound } from "../../lib/errors.js";
import { email, personName } from "../../lib/rules.js";
import { ADMIN_MODULES, ASSIGNABLE_MODULES } from "../../lib/permissions.js";
import { currentUser } from "../../middleware/auth.js";
import { logAdmin } from "../../services/audit.js";

/** Who is signed in to the admin app, and the admin team: staff accounts and their roles. */
export const adminTeamRouter = Router();

adminTeamRouter.get("/me", async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: currentUser(req).id },
    select: { id: true, name: true, email: true, role: true, profilePhotoUrl: true, adminRole: { select: { id: true, name: true } } },
  });
  res.json({ user, permissions: [...(req.permissions ?? [])], modules: ADMIN_MODULES });
});

const staffSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  adminRole: { select: { id: true, name: true } },
} as const;

adminTeamRouter.get("/team", async (_req, res) => {
  const members = await prisma.user.findMany({
    where: { role: { in: ["super_admin", "admin"] }, status: { not: "deleted" } },
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
    select: staffSelect,
  });
  res.json({ members });
});

function temporaryPassword() {
  // 12 characters, always with a letter and a digit so it passes the password rule.
  return `${randomBytes(6).toString("base64url").replace(/[-_]/g, "x").slice(0, 8)}a${Math.floor(100 + Math.random() * 900)}`;
}

const inviteSchema = z.object({ name: personName, email, roleId: z.number().int().positive() });

/**
 * Adds a staff member. Email delivery is not wired yet, so the temporary password is returned
 * once in the response for the super admin to share; the new member should change it after signing in.
 */
adminTeamRouter.post("/team", async (req, res) => {
  const body = parse(inviteSchema, req.body);
  const admin = currentUser(req);
  const role = await prisma.adminRole.findUnique({ where: { id: BigInt(body.roleId) } });
  if (!role) throw badRequest("Choose a role");
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing && existing.role !== "customer") throw conflict("This email already belongs to a provider or admin account");
  const password = temporaryPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const member = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { role: "admin", adminRoleId: role.id, status: "active", passwordHash }, select: staffSelect })
    : await prisma.user.create({
        data: { name: body.name, email: body.email, role: "admin", adminRoleId: role.id, passwordHash, emailVerifiedAt: new Date(), termsAcceptedAt: new Date() },
        select: staffSelect,
      });
  await logAdmin(admin.id, "team.invite", "user", member.id, { email: body.email, role: role.name });
  res.status(201).json({ member, temporaryPassword: password });
});

const memberUpdateSchema = z.object({ roleId: z.number().int().positive().optional(), status: z.enum(["active", "suspended"]).optional() });

async function staffTarget(req: Parameters<typeof currentUser>[0], id: bigint) {
  if (id === currentUser(req).id) throw badRequest("You cannot change your own access");
  const member = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!member || member.role !== "admin") throw notFound("Team member not found");
  return member;
}

adminTeamRouter.patch("/team/:id", async (req, res) => {
  const body = parse(memberUpdateSchema, req.body);
  const id = idParam(req.params.id as string);
  await staffTarget(req, id);
  if (body.roleId && !(await prisma.adminRole.findUnique({ where: { id: BigInt(body.roleId) } }))) throw badRequest("Choose a role");
  const member = await prisma.user.update({
    where: { id },
    data: { ...(body.roleId ? { adminRoleId: BigInt(body.roleId) } : {}), ...(body.status ? { status: body.status } : {}) },
    select: staffSelect,
  });
  await logAdmin(currentUser(req).id, "team.update", "user", id, body);
  res.json({ member });
});

adminTeamRouter.post("/team/:id/reset-password", async (req, res) => {
  const id = idParam(req.params.id as string);
  await staffTarget(req, id);
  const password = temporaryPassword();
  await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  await logAdmin(currentUser(req).id, "team.reset_password", "user", id);
  res.json({ temporaryPassword: password });
});

/** Removing a member keeps their account (and their audit history) but takes away admin access. */
adminTeamRouter.delete("/team/:id", async (req, res) => {
  const id = idParam(req.params.id as string);
  await staffTarget(req, id);
  await prisma.user.update({ where: { id }, data: { role: "customer", adminRoleId: null } });
  await prisma.supportTicket.updateMany({ where: { assignedToId: id, status: { in: ["open", "pending"] } }, data: { assignedToId: null } });
  await logAdmin(currentUser(req).id, "team.remove", "user", id);
  res.json({ ok: true });
});

// Roles ------------------------------------------------------------------------------------------

const roleSchema = z.object({
  name: z.string().trim().min(2, "Enter a role name").max(40),
  description: z.string().trim().max(200).nullable().optional(),
  permissions: z.array(z.enum(ASSIGNABLE_MODULES.map((m) => m.key) as [string, ...string[]])).min(1, "Pick at least one section"),
});

adminTeamRouter.get("/roles", async (_req, res) => {
  const roles = await prisma.adminRole.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { users: { where: { role: "admin" } } } } } });
  res.json({ roles, modules: ASSIGNABLE_MODULES });
});

adminTeamRouter.post("/roles", async (req, res) => {
  const body = parse(roleSchema, req.body);
  if (await prisma.adminRole.findUnique({ where: { name: body.name } })) throw conflict("A role with this name already exists");
  const role = await prisma.adminRole.create({ data: body });
  await logAdmin(currentUser(req).id, "role.create", "admin_role", role.id, body);
  res.status(201).json({ role });
});

adminTeamRouter.patch("/roles/:id", async (req, res) => {
  const body = parse(roleSchema.partial(), req.body);
  const id = idParam(req.params.id as string);
  if (body.name) {
    const clash = await prisma.adminRole.findUnique({ where: { name: body.name } });
    if (clash && clash.id !== id) throw conflict("A role with this name already exists");
  }
  const role = await prisma.adminRole.update({ where: { id }, data: body });
  await logAdmin(currentUser(req).id, "role.update", "admin_role", id, body);
  res.json({ role });
});

adminTeamRouter.delete("/roles/:id", async (req, res) => {
  const id = idParam(req.params.id as string);
  const inUse = await prisma.user.count({ where: { adminRoleId: id, role: "admin" } });
  if (inUse) throw badRequest(`Move the ${inUse} team member${inUse > 1 ? "s" : ""} with this role to another role first`);
  await prisma.adminRole.delete({ where: { id } });
  await logAdmin(currentUser(req).id, "role.delete", "admin_role", id);
  res.json({ ok: true });
});
