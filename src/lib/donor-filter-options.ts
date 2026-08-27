/**
 * 후원자 목록 검색·필터·정렬 옵션 정의 (서버·클라이언트 공용).
 *
 * 필터 UI(클라이언트 컴포넌트)가 Prisma를 번들에 끌어오지 않도록,
 * 화이트리스트/라벨만 이 모듈에 두고 실제 조회는 donor-query.ts(서버)에서 한다.
 */
import { DORMANT_DAYS } from "@/lib/donor-status";

export const DONOR_TYPES = ["all", "recurring", "onetime"] as const;
export const DONOR_STATUSES = ["all", "active", "stopped", "dormant", "new"] as const;
export const DONOR_PERIODS = ["all", "today", "7d", "thisMonth", "lastMonth", "thisYear", "custom"] as const;
export const DONOR_SORTS = ["recent", "amount", "count", "name", "created"] as const;

export type DonorType = (typeof DONOR_TYPES)[number];
export type DonorStatusFilter = (typeof DONOR_STATUSES)[number];
export type DonorPeriod = (typeof DONOR_PERIODS)[number];
export type DonorSort = (typeof DONOR_SORTS)[number];

export const DONOR_PAGE_SIZE = 20;
export const DONOR_MAX_PAGE_SIZE = 200;

export const DONOR_TYPE_LABELS: Record<DonorType, string> = {
  all: "전체 유형",
  recurring: "정기 후원자",
  onetime: "일시 후원자",
};

export const DONOR_STATUS_LABELS: Record<DonorStatusFilter, string> = {
  all: "전체 상태",
  active: "정기 후원 중",
  stopped: "정기 중단",
  dormant: `휴면 (${DORMANT_DAYS}일 이상 무후원)`,
  new: "이번 달 신규",
};

export const DONOR_PERIOD_LABELS: Record<DonorPeriod, string> = {
  all: "전체 기간",
  today: "오늘 후원",
  "7d": "최근 7일 후원",
  thisMonth: "이번 달 후원",
  lastMonth: "지난 달 후원",
  thisYear: "올해 후원",
  custom: "직접 선택",
};

export const DONOR_SORT_LABELS: Record<DonorSort, string> = {
  recent: "최근 후원일순",
  amount: "누적 금액순",
  count: "후원 횟수순",
  name: "이름순",
  created: "등록일순",
};

export type DonorQuery = {
  q: string;
  type: DonorType;
  status: DonorStatusFilter;
  period: DonorPeriod;
  from: string;
  to: string;
  sort: DonorSort;
  page: number;
  pageSize: number;
};

/** 현재 조회 조건을 쿼리스트링으로 (기본값은 생략해 URL을 짧게 유지) */
export function donorQueryToSearchParams(
  q: DonorQuery,
  override: Partial<Record<keyof DonorQuery, string | number>> = {}
): URLSearchParams {
  const sp = new URLSearchParams();
  const put = (k: string, v: string | number | undefined, def: string | number) => {
    const val = v === undefined ? def : v;
    if (String(val) !== String(def) && String(val) !== "") sp.set(k, String(val));
  };
  put("q", override.q ?? q.q, "");
  put("type", override.type ?? q.type, "all");
  put("status", override.status ?? q.status, "all");
  put("period", override.period ?? q.period, "all");
  put("from", override.from ?? q.from, "");
  put("to", override.to ?? q.to, "");
  put("sort", override.sort ?? q.sort, "recent");
  put("page", override.page ?? q.page, 1);
  return sp;
}
