import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getInfobankAdapter } from "@/lib/adapters";
import { SMS_DONATION_AMOUNT } from "@/lib/validation";

/**
 * 인포뱅크 문자후원 MO 결과 웹훅.
 *
 * MO (Mobile Originated) — 후원자가 지정 번호로 문자를 보내면 인포뱅크가 이 엔드포인트를 호출한다.
 * 처리 완료 후 MT(감사 문자)를 후원자에게 자동 발송한다.
 *
 * 예상 payload:
 * {
 *   providerTransactionId: string,
 *   status: "COMPLETED" | "FAILED",
 *   smsFullNumber: string,    // 수신 번호 (#25401234)
 *   senderPhone: string,      // 발신자 전화번호
 *   smsBody: string,          // 후원자가 보낸 문자 내용
 *   amount?: number,          // 전달되더라도 3000으로 고정
 * }
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-infobank-signature");
  const adapter = getInfobankAdapter();

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
      provider: "infobank",
      eventType: String(payload.eventType ?? "sms.mo"),
      payload: payload as object,
    },
  });

  // MT 발신 번호 (env가 비어있으면 MT 발송 생략)
  const mtSenderNumber = process.env.INFOBANK_MT_SENDER_NUMBER ?? "";

  try {
    const txId = payload.providerTransactionId as string | undefined;
    const status = (payload.status as string | undefined) ?? "COMPLETED";
    const smsBody = (payload.smsBody as string | undefined) ?? null;
    const senderPhone = (payload.senderPhone as string | undefined) ?? null;

    if (txId) {
      const donation = await prisma.donation.findUnique({
        where: { providerTransactionId: txId },
        include: { organization: { select: { name: true } } },
      });

      if (donation) {
        const next =
          status === "COMPLETED" ? "COMPLETED" :
          status === "FAILED"    ? "FAILED"    :
          donation.status;

        // M-4: 후원 상태 업데이트 + 캠페인 모금액 업데이트를 트랜잭션으로 처리
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          // 이중 가산 방지: 이미 next 상태이면 updateMany가 0건 반환 → 중복 처리 건너뜀
          const updated = await tx.donation.updateMany({
            where: { id: donation.id, status: { not: next } },
            data: {
              status: next,
              amount: SMS_DONATION_AMOUNT, // 항상 3,000원으로 보정
              donatedAt: next === "COMPLETED" ? new Date() : donation.donatedAt,
              smsBody: smsBody ?? donation.smsBody,
              senderPhone: senderPhone ?? donation.senderPhone,
            },
          });

          // 캠페인 모금액 업데이트 — COMPLETED 전환 시에만
          if (donation.campaignId && updated.count > 0 && donation.status !== "COMPLETED" && next === "COMPLETED") {
            await tx.campaign.update({
              where: { id: donation.campaignId },
              data: { currentAmount: { increment: SMS_DONATION_AMOUNT } },
            });
          }
        });

        // MT 발송 — 완료된 경우에만
        if (next === "COMPLETED" && senderPhone && mtSenderNumber) {
          const orgName = donation.organization?.name ?? "기관";
          const mtResult = await adapter.sendMt({
            recipientPhone: senderPhone,
            senderNumber: mtSenderNumber,
            message: `[나눔플러스] ${orgName}에 ${SMS_DONATION_AMOUNT.toLocaleString("ko-KR")}원을 후원해 주셔서 감사합니다. 따뜻한 마음이 큰 힘이 됩니다.`,
            providerTransactionId: txId,
          });
          if (!mtResult.ok) {
            console.error("[infobank-webhook] MT 발송 실패:", mtResult.message);
          }
        }
      } else {
        // 웹훅이 먼저 도착한 경우 — smsFullNumber로 기관을 찾아 바로 생성
        const smsFullNumber = payload.smsFullNumber as string | undefined;
        if (smsFullNumber && status === "COMPLETED") {
          const org = await prisma.organization.findFirst({
            where: { smsFullNumber, deletedAt: null },
          });
          if (org) {
            // M-4: 웹훅 선착 케이스 — donation 생성 + 캠페인 모금액 업데이트를 트랜잭션으로 처리
            await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
              const newDonation = await tx.donation.create({
                data: {
                  organizationId: org.id,
                  channel: "SMS",
                  amount: SMS_DONATION_AMOUNT,
                  status: "COMPLETED",
                  providerName: "infobank",
                  providerTransactionId: txId,
                  smsBody,
                  senderPhone,
                  donatedAt: new Date(),
                },
              });
              // 캠페인 ID가 있는 경우 모금액 업데이트
              if (newDonation.campaignId) {
                await tx.campaign.update({
                  where: { id: newDonation.campaignId },
                  data: { currentAmount: { increment: SMS_DONATION_AMOUNT } },
                });
              }
            });

            // MT 발송
            if (senderPhone && mtSenderNumber) {
              const mtResult = await adapter.sendMt({
                recipientPhone: senderPhone,
                senderNumber: mtSenderNumber,
                message: `[나눔플러스] ${org.name}에 ${SMS_DONATION_AMOUNT.toLocaleString("ko-KR")}원을 후원해 주셔서 감사합니다. 따뜻한 마음이 큰 힘이 됩니다.`,
                providerTransactionId: txId,
              });
              if (!mtResult.ok) {
                console.error("[infobank-webhook] MT 발송 실패:", mtResult.message);
              }
            }
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
