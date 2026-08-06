import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * 인포뱅크 MT 발송 결과 콜백.
 *
 * MT(Mobile Terminated) — 우리가 발송한 감사 문자에 대한 배달 상태를 인포뱅크가 이 엔드포인트로 통보한다.
 *
 * 보안: INFOBANK_WEBHOOK_SECRET으로 HMAC-SHA256 서명 검증 (C-3)
 *   - 요청 헤더: x-infobank-signature: <hex>
 *   - 서명 = HMAC-SHA256(rawBody, INFOBANK_WEBHOOK_SECRET)
 *
 * TODO: 실제 API 문서 확보 후 아래 부분을 구현한다.
 * - 예상 payload: { messageId, status: "DELIVERED"|"FAILED", recipientPhone, ... }
 * - status가 FAILED인 경우 알림 처리 등 추가
 */
export async function POST(req: Request) {
  const rawBody = await req.text();

  // C-3: HMAC 서명 검증 — infobank/route.ts와 동일한 패턴 적용
  const secret = process.env.INFOBANK_WEBHOOK_SECRET;
  const signature = req.headers.get("x-infobank-signature");
  if (!secret) {
    // 시크릿 미설정 시 fail-closed: 모든 요청 거부
    return Response.json({ error: "서버 설정 오류입니다." }, { status: 500 });
  }
  if (!signature) {
    return Response.json({ error: "서명이 없습니다." }, { status: 401 });
  }
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(signature);
  const valid = sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(expectedBuf, sigBuf);
  if (!valid) {
    return Response.json({ error: "서명 검증에 실패했습니다." }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "잘못된 페이로드입니다." }, { status: 400 });
  }

  // 웹훅 이벤트 기록 (추후 배달 상태 추적에 활용)
  await prisma.webhookEvent.create({
    data: {
      provider: "infobank",
      eventType: "sms.mt.callback",
      payload: payload as object,
    },
  });

  // TODO: MT 실패 시 재발송 또는 알림 로직 추가 (API 문서 확보 후)

  return Response.json({ ok: true });
}
