import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOnkiAdapter } from "@/lib/adapters";
import { syncCampaignAmountOnStatusChange } from "@/services/campaign-amount";

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
          // C-3 이중 가산 방지: 이미 next 상태이면 updateMany가 0건 반환 → 중복 처리 건너뜀
          const updated = await tx.donation.updateMany({
            where: { id: donation.id, status: { not: next } },
            data: { status: next },
          });

          // M-6: COMPLETED로 들어오면 가산, COMPLETED에서 빠져나가면(FAILED·REFUNDED 등) 차감.
          //      이전에는 REFUNDED만 되돌려 FAILED 전환 시 모금액이 부풀려진 채 남았다.
          if (updated.count > 0) {
            await syncCampaignAmountOnStatusChange(tx, donation, next);
          }
        });
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
