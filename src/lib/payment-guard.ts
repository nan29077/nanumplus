import { mockPaymentsAllowed, appEnv } from "./env";

/**
 * mock 결제 차단 가드.
 *
 * 문제(보안 점검 지적사항)
 *   /api/donations/{transfer,recurring,card}/init 는 **인증이 필요 없는 공개 API** 인데,
 *   어댑터가 mock 이면 결제 없이 곧바로 status=COMPLETED 후원 레코드를 만든다.
 *   운영에 mock 설정이 남아 있으면 누구나 임의 금액의 "완료된 후원"을 무제한 생성할 수 있고,
 *   그대로 캠페인 모금액·통계·정산 대상에 섞인다.
 *
 * 정책
 *   - APP_ENV 가 local / development 일 때만 mock 결제를 허용한다.
 *   - staging / production 에서는 mock 어댑터로 후원을 만들 수 없다(503).
 *   - 운영에서 일시적으로 열어야 하면 APP_ENV=local 을 명시적으로 설정해야 한다.
 *
 * @param live 해당 채널이 실연동(live) 어댑터로 동작 중인지
 * @returns 차단해야 하면 Response, 진행 가능하면 null
 */
export function blockMockDonation(live: boolean): Response | null {
  if (live) return null;
  if (mockPaymentsAllowed()) return null;

  console.error(
    `[payment-guard] mock 어댑터로 후원 생성 시도 차단 (APP_ENV=${appEnv()}). ` +
      "실연동 provider 설정(HECTO_*_PROVIDER / ONGI_PROVIDER)을 확인하세요."
  );
  return Response.json(
    {
      error: "현재 결제 연동이 준비되지 않아 후원을 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      code: "PAYMENT_PROVIDER_NOT_READY",
    },
    { status: 503 }
  );
}
