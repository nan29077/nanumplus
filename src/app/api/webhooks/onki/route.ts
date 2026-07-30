import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOnkiAdapter } from "@/lib/adapters";

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
          await tx.donation.update({ where: { id: donation.id }, data: { status: next } });
          if (donation.campaignId && donation.status !== "COMPLETED" && next === "COMPLETED") {
            await tx.campaign.update({
              where: { id: donation.campaignId },
              data: { currentAmount: { increment: donation.amount } },
            });
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
