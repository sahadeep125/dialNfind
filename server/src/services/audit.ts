import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { toPlain } from "../lib/serialize.js";

export async function logAdmin(adminId: bigint, action: string, targetType: string, targetId?: bigint, details?: unknown) {
  await prisma.adminActivityLog.create({
    data: {
      adminId,
      action,
      targetType,
      targetId: targetId ?? null,
      detailsJson: details === undefined ? Prisma.JsonNull : (toPlain(details) as Prisma.InputJsonValue),
    },
  });
}
