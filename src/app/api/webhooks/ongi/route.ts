import { prisma } from "@/lib/prisma";
import { verifyRef } from "@/lib/ongi";

/**
 * 온기(ONGI/핵토파이낸셜) 내통장결제 완료 콜백.
 *  - 온기 서버 → (결제 완료 확정 시) 우리 callback_url 로 HTTP POST(JSON).
 *  - 서명 헤더가 없으므로: 우리가 붙인 ref+sig(HMAC) 로 위조 방지 + payment_code 로 멱등 처리.
 *  - 무거운 처리는 최소화하고 빠르게 2xx 반환.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const ref = url.searchParams.get("ref");
  const sig = url.searchParams.get("sig");

  if (!ref || !verifyRef(ref, sig)) {
    return Response.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try { payload = (await req.json()) as Record<string, unknown>; }
  catch { /* 본문 파싱 실패해도 아래에서 방어 */ }

  const paymentCode = typeof payload.payment_code === "string" ? payload.payment_code : null;
  const state = typeof payload.state === "string" ? payload.state : "";
  const event = typeof payload.event === "string" ? payload.event : "";
  const resultCd = payload.result_cd != null ? String(payload.result_cd) : "";
  const amt = Number(payload.payment_amt ?? payload.pay_price ?? 0);

  // 감사 로그(가능하면 저장, 실패해도 무시)
  try {
    await prisma.webhookEvent.create({
      data: { provider: "ongi", eventType: event || "payment.callback", payload: payload as object },
    });
  } catch { /* ignore */ }

  const donation = await prisma.donation.findUnique({ where: { id: ref } });
  if (!donation) {
    // 우리 주문을 못 찾음 → 재시도 방지 위해 200 ack
    return Response.json({ ok: true, note: "no matching donation" });
  }

  // 멱등: 이미 완료됐거나 동일 payment_code 가 이미 처리됨
  if (donation.status === "COMPLETED") {
    return Response.json({ ok: true, note: "already completed" });
  }
  if (paymentCode) {
    const dup = await prisma.donation.findFirst({ where: { providerTransactionId: paymentCode } });
    if (dup) return Response.json({ ok: true, note: "duplicate payment_code" });
  }

  const success = event === "payment.completed" || state === "완료" || resultCd === "0";

  if (!success) {
    await prisma.donation.update({ where: { id: donation.id }, data: { status: "FAILED", memo: `온기 결제 실패 (${resultCd || state})` } });
    return Response.json({ ok: true, note: "payment not completed" });
  }

  // ── 금액 검증 ──────────────────────────────────────────────────────────────
  // 이전에는 금액이 달라도 메모만 남기고 COMPLETED 처리했다.
  // 1원만 결제하고 100만원짜리 후원을 완료 처리할 수 있는 구멍이므로 승인을 차단한다.
  // (재시도/정상 통지가 다시 올 수 있도록 상태는 PENDING 으로 두고 메모만 남긴다.)
  if (!Number.isFinite(amt) || amt <= 0 || amt !== donation.amount) {
    await prisma.donation.update({
      where: { id: donation.id },
      data: {
        memo: `온기 통지 금액 불일치로 승인 보류 (통지 ${Number.isFinite(amt) ? amt : "없음"} ≠ 요청 ${donation.amount})`,
      },
    });
    console.error(
      `[webhooks/ongi] 금액 불일치 — donationId=${donation.id} 통지=${amt} 요청=${donation.amount}`
    );
    // 재시도 폭주를 막기 위해 200 ack (승인은 하지 않음)
    return Response.json({ ok: true, note: "amount mismatch - not approved" });
  }

  await prisma.$transaction(async (tx) => {
    await tx.donation.update({
      where: { id: donation.id },
      data: {
        status: "COMPLETED",
        providerTransactionId: paymentCode ?? undefined,
        memo: "온기 내통장결제 완료",
      },
    });
    if (donation.campaignId) {
      await tx.campaign.update({ where: { id: donation.campaignId }, data: { currentAmount: { increment: donation.amount } } });
    }
  });

  return Response.json({ ok: true });
}
