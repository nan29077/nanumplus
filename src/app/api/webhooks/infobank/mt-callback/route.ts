import { prisma } from "@/lib/prisma";

/**
 * 인포뱅크 MT 발송 결과 콜백.
 *
 * MT(Mobile Terminated) — 우리가 발송한 감사 문자에 대한 배달 상태를 인포뱅크가 이 엔드포인트로 통보한다.
 *
 * TODO: 실제 API 문서 확보 후 아래 부분을 구현한다.
 * - 예상 payload: { messageId, status: "DELIVERED"|"FAILED", recipientPhone, ... }
 * - status가 FAILED인 경우 알림 처리 등 추가
 */
export async function POST(req: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(await req.text());
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
