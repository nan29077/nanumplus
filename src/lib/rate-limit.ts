/**
 * 간단한 인메모리 rate limiter (싱글 인스턴스 기준).
 *
 * M-7 주의사항 — 멀티 프로세스/멀티 인스턴스 환경 제한:
 *  - 이 구현은 Node.js 프로세스 메모리에 상태를 저장하므로
 *    PM2 cluster 모드, Docker 다중 컨테이너, Vercel Edge 등
 *    멀티 인스턴스 배포 시 인스턴스별 독립 카운터가 유지됩니다.
 *  - 즉, 공격자가 N개 인스턴스로 요청을 분산하면 limit * N 요청을 허용합니다.
 *
 * 프로덕션 권장: Redis 기반(Upstash Redis + @upstash/ratelimit 라이브러리)으로 교체.
 *  예시: https://github.com/upstash/ratelimit
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

/**
 * 토큰을 소비하지 않고 현재 한도 초과 여부만 확인한다.
 * 로그인처럼 "실패 횟수"만 카운트해야 하는 경우, 사전 검사는 이 함수로 하고
 * 실패 시에만 rateLimit()으로 토큰을 소비한다.
 */
export function isRateLimited(key: string, limit = 20): boolean {
  const b = buckets.get(key);
  if (!b || b.resetAt < Date.now()) return false;
  return b.count >= limit;
}
