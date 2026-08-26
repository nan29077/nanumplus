import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getInfobankAdapter } from "@/lib/adapters";
import { SMS_DONATION_AMOUNT } from "@/lib/validation";
import { syncCampaignAmountOnStatusChange } from "@/services/campaign-amount";
import { writeAuditLog } from "@/lib/audit";

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
          // 동시 웹훅 대비: 이전 상태를 트랜잭션 안에서 다시 읽고, 정확히 그 상태에서만
          // 전이시킨다. (밖에서 읽은 상태로 델타를 계산하면 이중 가산 가능)
          const current = await tx.donation.findUnique({
            where: { id: donation.id },
            select: { status: true, campaignId: true },
          });
          if (!current || current.status === next) return;

          const updated = await tx.donation.updateMany({
            where: { id: donation.id, status: current.status },
            data: {
              status: next,
              amount: SMS_DONATION_AMOUNT, // 항상 3,000원으로 보정
              donatedAt: next === "COMPLETED" ? new Date() : donation.donatedAt,
              smsBody: smsBody ?? donation.smsBody,
              senderPhone: senderPhone ?? donation.senderPhone,
            },
          });

          // M-6: COMPLETED로 들어오면 가산, COMPLETED에서 빠져나가면(FAILED 등) 차감.
          //      금액은 항상 SMS 고정가로 보정되므로 동일 금액으로 계산한다.
          if (updated.count > 0) {
            await syncCampaignAmountOnStatusChange(
              tx,
              { campaignId: current.campaignId, amount: SMS_DONATION_AMOUNT, status: current.status },
              next
            );
          }
        });

        // 이미 정산에 포함된 후원이 실패로 전환되면 정산 금액과 어긋난다 — 감사 로그로 보정 요청
        if (next === "FAILED") {
          const linked = await prisma.settlementItem.findUnique({
            where: { donationId: donation.id },
            select: { settlementId: true },
          });
          if (linked) {
            console.error(
              `[infobank-webhook] 정산 포함 후원(${donation.id})이 FAILED로 전환됨 — 정산(${linked.settlementId}) 금액 보정 필요`
            );
            await writeAuditLog({
              userId: null,
              action: "SETTLEMENT_ADJUST_REQUIRED",
              entityType: "Settlement",
              entityId: linked.settlementId,
              detail: { donationId: donation.id, next, provider: "infobank" },
            });
          }
        }

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
        const smsFullNumberRaw = payload.smsFullNumber as string | undefined;
        if (smsFullNumberRaw && status === "COMPLETED") {
          // payload는 대시 없는 형식(#25401234)일 수 있고 DB는 대시 포함(#2540-1234)이다.
          // EMMA 처리기(mo-processor)와 동일하게 정규화한 값도 함께 조회한다.
          const normalized = smsFullNumberRaw.replace(/^(#\d{4})(?!-)(\d)/, "$1-$2");
          const candidates = Array.from(new Set([smsFullNumberRaw, normalized]));
          const org = await prisma.organization.findFirst({
            where: { smsFullNumber: { in: candidates }, deletedAt: null, isActive: true },
          });
          if (org) {
            // B-1: 이전 구현은 campaignId를 넣지 않고 생성한 뒤 newDonation.campaignId를
            //      확인했기 때문에 이 값이 항상 null이었고 캠페인 모금액이 갱신되지 않았다.
            //      payload의 campaignId를 "해당 기관 소유"로 검증한 뒤 후원에 연결한다.
            const rawCampaignId = (payload.campaignId as string | undefined)?.trim() || null;
            let campaignId: string | null = null;
            if (rawCampaignId) {
              const campaign = await prisma.campaign.findFirst({
                where: { id: rawCampaignId, organizationId: org.id, deletedAt: null },
                select: { id: true },
              });
              campaignId = campaign?.id ?? null;
            }

            // M-4: 웹훅 선착 케이스 — donation 생성 + 캠페인 모금액 업데이트를 트랜잭션으로 처리
            await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
              await tx.donation.create({
                data: {
                  organizationId: org.id,
                  campaignId,
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
              await syncCampaignAmountOnStatusChange(
                tx,
                { campaignId, amount: SMS_DONATION_AMOUNT, status: "PENDING" },
                "COMPLETED"
              );
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
