/**
 * 간단한 인메모리 rate limiter (싱글 인스턴스 기준).
 * 프로덕션에서는 Redis 기반(Upstash 등)으로 교체 권장.
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
