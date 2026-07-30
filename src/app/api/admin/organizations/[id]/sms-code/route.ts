import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";

const schema = z.object({
  code: z.string().regex(/^\d{4}$/, "4"),
});

/**
 * SMS code assignment for org (SUPER_ADMIN only).
 * Base: #2540, format: #2540-XXXX (with dash)
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { code } = parsed.data;
  const baseNumber = "#2540";
  const fullNumber = `${baseNumber}-${code}`;

  const org = await prisma.organization.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!org) return Response.json({ error: "Not found" }, { status: 404 });

  const dup = await prisma.organization.findFirst({
    where: {
      id: { not: org.id },
      OR: [{ smsCode: code }, { smsFullNumber: fullNumber }],
    },
  });
  if (dup) {
    return Response.json({ error: `Already assigned to ${dup.name}` }, { status: 409 });
  }
  const assignDup = await prisma.smsNumberAssignment.findUnique({ where: { fullNumber } });
  if (assignDup && assignDup.organizationId !== org.id) {
    return Response.json({ error: "Number already assigned" }, { status: 409 });
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.smsNumberAssignment.updateMany({
      where: { organizationId: org.id, isActive: true },
      data: { isActive: false, revokedAt: new Date() },
    });
    await tx.organization.update({
      where: { id: org.id },
      data: { smsBaseNumber: baseNumber, smsCode: code, smsFullNumber: fullNumber },
    });
    await tx.smsNumberAssignment.create({
      data: {
        organizationId: org.id,
        baseNumber,
        code,
        fullNumber,
        assignedById: auth.user.id,
      },
    });
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "SMS_CODE_ASSIGN",
    entityType: "Organization",
    entityId: org.id,
    detail: { code, fullNumber, previous: org.smsFullNumber },
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true, smsFullNumber: fullNumber });
}
