/**
 * 후원 내역 목록의 기간 필터 공용 헬퍼
 *
 * 8개 목록 화면(최고관리자·기관관리자 × 전체/문자/간편이체/정기)이 같은 규칙으로
 * 기간을 거르고, 같은 방식으로 합계를 내도록 한곳에 모아 둔다.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ListPeriod } from "@/lib/kst-date";

/** 목록 화면에 보여줄 빠른 선택 버튼 순서 */
export const LIST_PERIOD_PRESETS = [
  "all", "today", "thisWeek", "thisMonth", "lastMonth", "thisYear",
] as const;

/** Prisma where 에 끼워 넣을 donatedAt 조건. 전체 기간이면 빈 객체. */
export function donatedAtWhere(p: Pick<ListPeriod, "from" | "to">): Prisma.DonationWhereInput {
  if (!p.from && !p.to) return {};
  return {
    donatedAt: {
      ...(p.from ? { gte: p.from } : {}),
      ...(p.to ? { lte: p.to } : {}),
    },
  };
}

/**
 * raw SQL 비교용 UTC 타임스탬프 문자열 ("2026-09-01 15:00:00.000").
 *
 * Prisma 는 DateTime 을 timestamp(3)(시간대 없음) 컬럼에 UTC 벽시계 값으로 저장한다.
 * 그래서 비교 값도 UTC 벽시계 문자열을 ::timestamp 로 캐스팅해 넘긴다.
 * (JS Date 를 그대로 바인딩하면 DB 세션 시간대에 따라 해석이 달라질 수 있다)
 */
export function toPgUtcTimestamp(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().replace("T", " ").replace("Z", "");
}

/**
 * 같은 목록 화면 안에서 쓰는 링크 주소를 만든다.
 * 기존 필터(기관·채널·상태·기간)를 유지하면서 일부만 바꾸고, 쪽번호는 1로 되돌린다.
 *
 * 문자후원 화면의 상태 버튼이 `?status=..&page=1` 처럼 주소를 새로 만들어
 * 고른 기간이 풀려버리던 문제를 막기 위함이다.
 */
export function listHref(
  sp: Record<string, string | undefined>,
  overrides: Record<string, string | null>
): string {
  const KEEP = ["orgId", "channel", "status", "period", "from", "to"];
  const q = new URLSearchParams();
  for (const k of KEEP) {
    const v = sp[k];
    if (v) q.set(k, v);
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v) q.set(k, v);
    else q.delete(k);
  }
  q.delete("page");
  const s = q.toString();
  return s ? `?${s}` : "?";
}

/**
 * 지금 조건 안에서 "완료" 상태만의 건수·금액.
 * AND 로 묶기 때문에 상태 필터가 '실패'면 결과는 0건·0원이 된다(조건의 교집합).
 */
export async function completedSummary(
  where: Prisma.DonationWhereInput
): Promise<{ completedCount: number; completedAmount: number }> {
  const r = await prisma.donation.aggregate({
    where: { AND: [where, { status: "COMPLETED" }] },
    _count: { _all: true },
    _sum: { amount: true },
  });
  return { completedCount: r._count._all, completedAmount: r._sum.amount ?? 0 };
}
