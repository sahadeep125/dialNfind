import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { parse } from "../lib/validate.js";
import { optionalAuth } from "../middleware/auth.js";

export const miscRouter = Router();

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  subject: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10).max(3000),
});

miscRouter.post("/contact", optionalAuth, async (req, res) => {
  const body = parse(contactSchema, req.body);
  const message = await prisma.contactMessage.create({
    data: { ...body, phone: body.phone || null, userId: req.user?.id ?? null },
  });
  res.status(201).json({ ok: true, id: message.id });
});

miscRouter.get("/plans", async (_req, res) => {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" },
    include: { badge: true },
  });
  res.json({ plans });
});

miscRouter.get("/stats", async (_req, res) => {
  const [providers, categories, cities, reviews] = await Promise.all([
    prisma.provider.count({ where: { status: "active" } }),
    prisma.category.count({ where: { isActive: true } }),
    prisma.provider.groupBy({ by: ["city"], where: { status: "active" } }),
    prisma.review.count({ where: { status: "published" } }),
  ]);
  res.json({ providers, categories, cities: cities.length, reviews });
});

miscRouter.get("/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true });
});
