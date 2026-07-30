import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { sanitizeText } from "@/lib/sanitize";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const org = await prisma.organization.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      admins: { include: { user: { select: { name: true, email: true, isActive: true } } } },
      smsAssignments: { orderBy: { assignedAt: "desc" } },
      qrCodes: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { donations: true, donors: true, campaigns: true } },
    },
  });
  if (!org) return Response.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });
  return Response.json({ organization: org });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const d = parsed.data;

  const org = await prisma.organization.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!org) return Response.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });

  const updated = await prisma.organization.update({
    where: { id: params.id },
    data: {
      ...(d.name !== undefined ? { name: sanitizeText(d.name, 80) } : {}),
      ...(d.description !== undefined ? { description: d.description ? sanitizeText(d.description, 500) : null } : {}),
      ...(d.address !== undefined ? { address: d.address ? sanitizeText(d.address, 200) : null } : {}),
      ...(d.phone !== undefined ? { phone: d.phone || null } : {}),
      ...(d.email !== undefined ? { email: d.email || null } : {}),
      ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
    },
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "ORGANIZATION_UPDATE",
    entityType: "Organization",
    entityId: org.id,
    detail: d as Record<string, unknown>,
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true, organization: updated });
}

/** soft delete */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const org = await prisma.organization.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!org) return Response.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });

  await prisma.organization.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), isActive: false },
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "ORGANIZATION_DELETE",
    entityType: "Organization",
    entityId: org.id,
    detail: { name: org.name },
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true });
}
