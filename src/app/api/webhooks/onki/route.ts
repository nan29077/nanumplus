import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOnkiAdapter } from "@/lib/adapters";
import { syncCampaignAmountOnStatusChange } from "@/services/campaign-amount";
import { writeAuditLog } from "@/lib/audit";

/**
 * 온기 결제 결과 웹훅 (Mock).
 * payload 예: { providerTransactionId, status, amount, eventType }
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-onki-signature");
  const adapter = getOnkiAdapter();

  if (!adapter.verifyWebhookSignature(rawBody, signature)) {
    return Response.json({ error: "서명 검증에 실패했습니다." }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "잘못된 페이로드입니다." }, { status: 400 });
  }

  const event = await prisma.webhookEvent.create({
    data: {
      provider: "onki",
      eventType: String(payload.eventType ?? "transfer.result"),
      payload: payload as object,
    },
  });

  try {
    const txId = payload.providerTransactionId as string | undefined;
    const status = (payload.status as string | undefined) ?? "COMPLETED";

    if (txId) {
      const donation = await prisma.donation.findUnique({
        where: { providerTransactionId: txId },
      });
      if (donation) {
        const next =
          status === "COMPLETED" ? "COMPLETED" :
          status === "FAILED" ? "FAILED" :
          status === "REFUNDED" ? "REFUNDED" : donation.status;

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          // 동시 웹훅 대비: 이전 상태를 트랜잭션 안에서 다시 읽고, 정확히 그 상태에서만
          // 전이시킨다. (트랜잭션 밖에서 읽은 상태로 델타를 계산하면 COMPLETED·REFUNDED
          // 웹훅이 근접 도착할 때 캠페인 모금액이 이중 가산될 수 있다)
          const current = await tx.donation.findUnique({
            where: { id: donation.id },
            select: { status: true, campaignId: true, amount: true },
          });
          if (!current || current.status === next) return;

          const updated = await tx.donation.updateMany({
            where: { id: donation.id, status: current.status },
            data: { status: next },
          });

          // M-6: COMPLETED로 들어오면 가산, COMPLETED에서 빠져나가면(FAILED·REFUNDED 등) 차감.
          if (updated.count > 0) {
            await syncCampaignAmountOnStatusChange(
              tx,
              { campaignId: current.campaignId, amount: current.amount, status: current.status },
              next
            );
          }
        });

        // 이미 정산에 포함된 후원이 환불·실패로 전환되면 정산 금액과 어긋난다.
        // 상태 자체는 실제 결제 결과이므로 반영하되, 감사 로그로 남겨 관리자가 보정하게 한다.
        if (next === "REFUNDED" || next === "FAILED" || next === "CANCELLED") {
          const linked = await prisma.settlementItem.findUnique({
            where: { donationId: donation.id },
            select: { settlementId: true },
          });
          if (linked) {
            console.error(
              `[onki-webhook] 정산 포함 후원(${donation.id})이 ${next}로 전환됨 — 정산(${linked.settlementId}) 금액 보정 필요`
            );
            await writeAuditLog({
              userId: null,
              action: "SETTLEMENT_ADJUST_REQUIRED",
              entityType: "Settlement",
              entityId: linked.settlementId,
              detail: { donationId: donation.id, next, provider: "onki" },
            });
          }
        }
      }
    }
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { processed: true, processedAt: new Date() },
    });
  } catch (e) {
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { error: e instanceof Error ? e.message : "처리 오류" },
    });
    return Response.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
