import crypto from "crypto";

/** 온기(ONGI) 내통장결제 연동 유틸.
 *  - 가맹점 QR코드는 플랫폼 공용 1개(env ONGI_QR_CODE, 씨드파이낸셜).
 *  - 기관 귀속은 우리 내부 ref(=donation.id)로 처리(콜백 URL 쿼리로 전달).
 *  - 온기 콜백엔 서명이 없으므로, 우리가 ref에 HMAC 서명을 붙여 위조를 방지한다.
 */
export function ongiIsLive(): boolean {
  return process.env.ONGI_PROVIDER === "live";
}

function refSecret(): string {
  return process.env.ONGI_CALLBACK_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret";
}

export function signRef(ref: string): string {
  return crypto.createHmac("sha256", refSecret()).update(ref).digest("hex").slice(0, 32);
}

export function verifyRef(ref: string, sig: string | null): boolean {
  if (!ref || !sig) return false;
  const expected = signRef(ref);
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
