import type { Request } from "express";
import { prisma } from "../../lib/prisma.js";
import { forbidden, notFound } from "../../lib/errors.js";
import { currentUser } from "../../middleware/auth.js";

/** Returns the provider row owned by the signed-in user, or 404 if they have not onboarded yet. */
export async function ownProvider(req: Request) {
  const user = currentUser(req);
  if (user.role !== "provider" && user.role !== "super_admin") throw forbidden("Provider account required");
  const provider = await prisma.provider.findUnique({ where: { userId: user.id } });
  if (!provider) throw notFound("You have not set up a business profile yet");
  return provider;
}
