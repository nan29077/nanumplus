import crypto from "crypto";

/** 온기(ONGI) 내통장결제 연동 유틸.
 *  - 가맹점 QR코드는 플랫폼 공용 1개(env ONGI_QR_CODE, 씨드파이낸셜).
 *  - 기관 귀속은 우리 내부 ref(=donation.id)로 처리(콜백 URL 쿼리로 전달).
 *  - 온기 콜백엔 서명이 없으므로, 우리가 ref에 HMAC 서명을 붙여 위조를 방지한다.
 */
export function ongiIsLive(): boolean {
  return process.env.ONGI_PROVIDER === "live";
}

/**
 * 콜백 ref 서명 시크릿.
 *
 * 이전에는 `"dev-secret"` 폴백이 있어, 환경변수를 빠뜨린 채 배포하면
 * 공개된 상수로 서명이 만들어져 누구나 위조 콜백으로 후원을 COMPLETED 처리할 수 있었다.
 * 폴백을 제거하고, 값이 없으면 예외를 던져 기동/요청을 실패시킨다.
 * (필수 환경변수 검증은 src/lib/env.ts + src/instrumentation.ts 에서 기동 시 수행한다.)
 */
function refSecret(): string {
  const secret = process.env.ONGI_CALLBACK_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "[ongi] ONGI_CALLBACK_SECRET (또는 NEXTAUTH_SECRET) 이 설정되지 않았습니다. 콜백 서명을 만들 수 없습니다."
    );
  }
  return secret;
}

export function signRef(ref: string): string {
  return crypto.createHmac("sha256", refSecret()).update(ref).digest("hex").slice(0, 32);
}

export function verifyRef(ref: string, sig: string | null): boolean {
  if (!ref || !sig) return false;
  let expected: string;
  try {
    expected = signRef(ref);
  } catch {
    // 시크릿 미설정 → 어떤 콜백도 신뢰하지 않는다.
    return false;
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** 온기 PG(간소) 결제창 URL 생성 (해시 라우터 형식) */
export function buildOngiPaymentUrl(opts: {
  name: string;
  phone?: string;
  amount: number;
  callbackUrl: string;
  returnUrl: string;
}): string {
  const qr = process.env.ONGI_QR_CODE ?? "";
  const base = (process.env.ONGI_PAY_BASE_URL ?? "https://pay.ongi.site").replace(/\/+$/, "");
  const params = new URLSearchParams({
    checkout: "pg",
    name: opts.name,
    phone: opts.phone ?? "",
    amount: String(opts.amount),
    callback_url: opts.callbackUrl,
    return_url: opts.returnUrl,
  });
  // 해시 라우터: #/qr/{코드}?쿼리
  return `${base}/#/qr/${qr}?${params.toString()}`;
}

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "").replace(/\/+$/, "");
}
