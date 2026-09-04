/**
 * 클라이언트 IP 추출 — X-Forwarded-For 스푸핑 방어.
 *
 * 문제: `xff.split(",")[0]` 은 **클라이언트가 직접 써 넣은 값**이다.
 *       공격자가 `X-Forwarded-For: 1.2.3.4` 를 매 요청마다 바꿔 보내면
 *       IP 기준 rate-limit(로그인 실패 제한 등)을 무제한으로 우회할 수 있다.
 *
 * 해결: X-Forwarded-For 는 "클라이언트가 보낸 값, 프록시1이 붙인 값, ... " 순으로 누적된다.
 *       우리가 신뢰할 수 있는 것은 **우리 앞단 프록시가 붙인 마지막 홉**뿐이다.
 *       프록시가 N단이면 TRUSTED_PROXY_HOPS=N 으로 조정한다. (기본 1 = 맨 뒤 값)
 */

function trustedHops(): number {
  const n = Number(process.env.TRUSTED_PROXY_HOPS ?? 1);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/** 헤더 조회 함수를 받아 신뢰 가능한 클라이언트 IP를 반환 */
export function resolveClientIp(get: (name: string) => string | null | undefined): string {
  const xff = get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) {
      // 맨 뒤에서 (신뢰 프록시 단 수 - 1) 만큼 앞으로 이동한 위치가 실제 클라이언트 IP.
      const idx = Math.max(0, parts.length - trustedHops());
      return parts[idx] ?? parts[parts.length - 1];
    }
  }
  // x-real-ip 는 프록시가 직접 세팅하므로 다음 순위로 신뢰한다.
  return get("x-real-ip")?.trim() || "unknown";
}

/** Headers 객체용 헬퍼 */
export function clientIpFromHeaders(headers: Headers): string {
  return resolveClientIp((n) => headers.get(n));
}
