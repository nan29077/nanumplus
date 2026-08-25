import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";
import { applyCampaignAmountDelta } from "@/services/campaign-amount";

/**
 * 후원 건 상태 변경 / 취소 (최고 관리자).
 *
 * M-6: 후원이 COMPLETED에서 빠져나가거나(취소·환불·실패) soft delete 될 때
 * Campaign.currentAmount를 되돌린다. 이 처리가 없으면 잘못 기록된 후원을
 * 정리해도 캠페인 모금액은 부풀려진 채로 남는다.
 */
const patchSchema = z.object({
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED"]).optional(),
  /** true면 soft delete (목록·통계에서 제외) */
  deleted: z.boolean().optional(),
  memo: z.string().max(500).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
  }
  const { status, deleted, memo } = parsed.data;
  if (status === undefined && deleted === undefined && memo === undefined) {
    return Response.json({ error: "변경할 내용이 없습니다." }, { status: 400 });
  }

  const donation = await prisma.donation.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, amount: true, campaignId: true, deletedAt: true },
  });
  if (!donation) return Response.json({ error: "후원 내역을 찾을 수 없습니다." }, { status: 404 });

  // 이미 정산에 포함된 후원은 되돌리면 정산 합계와 어긋나므로 차단한다.
  if ((status !== undefined && status !== donation.status) || deleted === true) {
    const settled = await prisma.settlementItem.findUnique({
      where: { donationId: donation.id },
      select: { settlementId: true },
    });
    if (settled) {
      return Response.json(
        { error: "이미 정산에 포함된 후원입니다. 해당 정산을 먼저 취소해 주세요." },
        { status: 409 }
      );
    }
  }

  // 캠페인 모금액에 잡히는 조건 = "삭제되지 않은 COMPLETED 후원"
  const countedBefore = !donation.deletedAt && donation.status === "COMPLETED";
  const nextStatus = status ?? donation.status;
  const nextDeleted = deleted === true ? true : deleted === false ? false : donation.deletedAt !== null;
  const countedAfter = !nextDeleted && nextStatus === "COMPLETED";
  const delta = (countedAfter ? donation.amount : 0) - (countedBefore ? donation.amount : 0);

  const updated = await prisma.$transaction(async (tx) => {
    await applyCampaignAmountDelta(tx, donation.campaignId, delta);

    return tx.donation.update({
      where: { id: donation.id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(memo !== undefined ? { memo } : {}),
        ...(deleted === true ? { deletedAt: donation.deletedAt ?? new Date() } : {}),
        ...(deleted === false ? { deletedAt: null } : {}),
      },
    });
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: deleted === true ? "DONATION_DELETE" : "DONATION_STATUS_CHANGE",
    entityType: "Donation",
    entityId: donation.id,
    detail: {
      from: donation.status,
      to: status ?? donation.status,
      deleted: deleted ?? false,
      campaignId: donation.campaignId,
      amount: donation.amount,
    },
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true, donation: updated });
}
