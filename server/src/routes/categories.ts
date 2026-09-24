import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { idParam, parse } from "../lib/validate.js";
import { notFound } from "../lib/errors.js";
import { currentUser, requireRole } from "../middleware/auth.js";
import { slugify } from "../lib/slug.js";
import { logAdmin } from "../services/audit.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: { subcategories: { where: { isActive: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] } },
  });
  res.json({ categories });
});

categoriesRouter.get("/:slug", async (req, res) => {
  const category = await prisma.category.findUnique({
    where: { slug: req.params.slug as string },
    include: {
      subcategories: { where: { isActive: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] },
      attributes: { orderBy: { displayOrder: "asc" } },
    },
  });
  if (!category || !category.isActive) throw notFound("Category not found");
  res.json({ category });
});

// ---------------------------------------------------------------------------
// Super-admin only: categories, subcategories and attributes are never provider-created.
// ---------------------------------------------------------------------------

const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().max(60).optional(),
  description: z.string().max(300).nullable().optional(),
  iconUrl: z.string().nullable().optional(),
  uiTemplate: z.string().max(40).optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

categoriesRouter.post("/", requireRole("super_admin"), async (req, res) => {
  const body = parse(categorySchema, req.body);
  const admin = currentUser(req);
  const category = await prisma.category.create({
    data: { ...body, slug: body.slug || slugify(body.name), createdBy: admin.id, updatedBy: admin.id },
  });
  await logAdmin(admin.id, "category.create", "category", category.id, body);
  res.status(201).json({ category });
});

categoriesRouter.patch("/:id", requireRole("super_admin"), async (req, res) => {
  const body = parse(categorySchema.partial(), req.body);
  const admin = currentUser(req);
  const id = idParam(req.params.id);
  const category = await prisma.category.update({ where: { id }, data: { ...body, updatedBy: admin.id } });
  await logAdmin(admin.id, "category.update", "category", id, body);
  res.json({ category });
});

categoriesRouter.delete("/:id", requireRole("super_admin"), async (req, res) => {
  const admin = currentUser(req);
  const id = idParam(req.params.id);
  // Soft delete keeps provider_services referentially valid.
  await prisma.category.update({ where: { id }, data: { isActive: false, updatedBy: admin.id } });
  await logAdmin(admin.id, "category.deactivate", "category", id);
  res.json({ ok: true });
});

const subcategorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().max(80).optional(),
  iconUrl: z.string().nullable().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

categoriesRouter.post("/:id/subcategories", requireRole("super_admin"), async (req, res) => {
  const body = parse(subcategorySchema, req.body);
  const admin = currentUser(req);
  const categoryId = idParam(req.params.id);
  const subcategory = await prisma.subcategory.create({
    data: { ...body, categoryId, slug: body.slug || slugify(body.name), createdBy: admin.id, updatedBy: admin.id },
  });
  await logAdmin(admin.id, "subcategory.create", "subcategory", subcategory.id, body);
  res.status(201).json({ subcategory });
});

categoriesRouter.patch("/subcategories/:id", requireRole("super_admin"), async (req, res) => {
  const body = parse(subcategorySchema.partial(), req.body);
  const admin = currentUser(req);
  const id = idParam(req.params.id);
  const subcategory = await prisma.subcategory.update({ where: { id }, data: { ...body, updatedBy: admin.id } });
  await logAdmin(admin.id, "subcategory.update", "subcategory", id, body);
  res.json({ subcategory });
});

const attributeSchema = z.object({
  subcategoryId: z.number().int().nullable().optional(),
  appliesTo: z.enum(["lead", "provider"]),
  label: z.string().trim().min(1).max(60),
  fieldType: z.enum(["text", "number", "select", "multiselect", "boolean"]),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

categoriesRouter.post("/:id/attributes", requireRole("super_admin"), async (req, res) => {
  const body = parse(attributeSchema, req.body);
  const admin = currentUser(req);
  const categoryId = idParam(req.params.id);
  const attribute = await prisma.categoryAttribute.create({
    data: {
      categoryId,
      subcategoryId: body.subcategoryId ? BigInt(body.subcategoryId) : null,
      appliesTo: body.appliesTo,
      label: body.label,
      fieldType: body.fieldType,
      optionsJson: body.options,
      isRequired: body.isRequired ?? false,
      displayOrder: body.displayOrder ?? 0,
      createdBy: admin.id,
    },
  });
  await logAdmin(admin.id, "attribute.create", "category_attribute", attribute.id, body);
  res.status(201).json({ attribute });
});
