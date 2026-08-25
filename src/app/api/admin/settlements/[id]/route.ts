import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";

const patchSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"]),
  note: z.string().max(300).optional(),
});

type SettlementStatusKey = "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";

/**
 * B-3 정산 상태 전이 규칙.
 *  - COMPLETED(지급 완료) · CANCELLED(취소)는 종료 상태 → 되돌릴 수 없다.
 *    (COMPLETED → PENDING 되돌리기가 가능하면 이미 지급된 정산에 금액이 다시 가산된다)
 *  - 같은 상태로의 요청은 메모만 갱신하는 no-op으로 허용한다.
 */
const ALLOWED_TRANSITIONS: Record<SettlementStatusKey, SettlementStatusKey[]> = {
  PENDING: ["PROCESSING", "COMPLETED", "CANCELLED"],
  PROCESSING: ["PENDING", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

const STATUS_LABEL: Record<SettlementStatusKey, string> = {
  PENDING: "정산 대기",
  PROCESSING: "처리 중",
  COMPLETED: "정산 완료",
  CANCELLED: "취소",
};

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

  const from = settlement.status as SettlementStatusKey;
  const isNoop = from === status;
  if (!isNoop && !ALLOWED_TRANSITIONS[from].includes(status)) {
    return Response.json(
      { error: `${STATUS_LABEL[from]} 상태의 정산은 ${STATUS_LABEL[status]}(으)로 변경할 수 없습니다.` },
      { status: 400 }
    );
  }

  // C-3: 취소 시 연결된 SettlementItem을 해제해 해당 후원 건이 다시 정산 대상이 되도록 한다.
  // (SettlementItem.donationId가 unique이므로 남겨두면 그 후원금은 영원히 재정산되지 않는다.
  //  취소된 정산 자체는 금액 스냅샷과 함께 이력으로 남긴다.)
  let releasedItems = 0;
  const updated = await prisma.$transaction(async (tx) => {
    if (!isNoop && status === "CANCELLED") {
      const del = await tx.settlementItem.deleteMany({ where: { settlementId: params.id } });
      releasedItems = del.count;
    }
    return tx.settlement.update({
      where: { id: params.id },
      data: {
        status,
        ...(note !== undefined ? { note } : {}),
        // B-3: 이미 기록된 처리 일시는 덮어쓰지 않는다.
        ...(status === "COMPLETED" && !settlement.processedAt ? { processedAt: new Date() } : {}),
      },
    });
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "SETTLEMENT_STATUS_CHANGE",
    entityType: "Settlement",
    entityId: params.id,
    detail: {
      from: settlement.status,
      to: status,
      organizationId: settlement.organizationId,
      ...(releasedItems > 0 ? { releasedItems } : {}),
    },
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true, settlement: updated, releasedItems });
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
