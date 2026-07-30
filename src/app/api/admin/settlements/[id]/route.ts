import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";

const patchSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"]),
  note: z.string().max(300).optional(),
});

/** 정산 상태 변경 (관리자) */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { status, note } = parsed.data;

  const settlement = await prisma.settlement.findUnique({ where: { id: params.id } });
  if (!settlement) return Response.json({ error: "정산 내역을 찾을 수 없습니다." }, { status: 404 });

  const updated = await prisma.settlement.update({
    where: { id: params.id },
    data: {
      status,
      ...(note !== undefined ? { note } : {}),
      ...(status === "COMPLETED" ? { processedAt: new Date() } : {}),
    },
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "SETTLEMENT_STATUS_CHANGE",
    entityType: "Settlement",
    entityId: params.id,
    detail: { from: settlement.status, to: status, organizationId: settlement.organizationId },
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true, settlement: updated });
}

/** 정산 상세 조회 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const settlement = await prisma.settlement.findUnique({
    where: { id: params.id },
    include: {
      organization: { select: { name: true, bankName: true, bankAccount: true, bankHolder: true } },
      items: {
        include: { donation: { select: { channel: true, donatedAt: true, amount: true, senderPhone: true } } },
        orderBy: { donatedAt: "desc" },
      },
    },
  });

  if (!settlement) return Response.json({ error: "정산 내역을 찾을 수 없습니다." }, { status: 404 });
  return Response.json({ settlement });
}
