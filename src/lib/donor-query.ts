/**
 * 기관 후원자 목록 조회 (검색·필터·정렬·페이지네이션).
 *
 * 누적 후원금액/후원건수/첫·최근 후원일 기준 정렬은 Donation 집계값이 필요하고,
 * 정렬 후 페이지네이션까지 정확해야 하므로 Prisma ORM 대신 raw SQL로 한 번에 처리한다.
 * (페이지 단위로 집계하던 기존 방식은 "누적 금액순 정렬"을 만들 수 없었다.)
 *
 * 모든 쿼리는 organizationId로 스코프가 고정되며, 사용자 입력은 전부
 * 파라미터 바인딩 또는 화이트리스트를 거친다.
 */
import { Prisma } from "@prisma/client";
import { startOfMonth, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { parsePageParam } from "@/lib/utils";
import { kstToUtc, nowKst, periodRange, type PeriodKey } from "@/lib/kst-date";
import { DORMANT_DAYS } from "@/lib/donor-status";
import {
  DONOR_TYPES, DONOR_STATUSES, DONOR_PERIODS, DONOR_SORTS,
  DONOR_PAGE_SIZE, DONOR_MAX_PAGE_SIZE,
  type DonorQuery, type DonorSort,
} from "@/lib/donor-filter-options";

// 필터 옵션/라벨 정의는 클라이언트에서도 쓰이므로 donor-filter-options 에 두고 여기서 재수출한다.
export * from "@/lib/donor-filter-options";

type RawParams = Record<string, string | string[] | undefined>;

function pick<T extends string>(raw: unknown, allowed: readonly T[], fallback: T): T {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function pickText(raw: unknown, maxLen: number): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return typeof v === "string" ? v.trim().slice(0, maxLen) : "";
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** searchParams(페이지) / URLSearchParams(API) 를 안전한 조회 조건으로 변환 */
export function parseDonorQuery(raw: RawParams | URLSearchParams): DonorQuery {
  const get = (k: string) =>
    raw instanceof URLSearchParams ? (raw.get(k) ?? undefined) : raw[k];

  const fromRaw = pickText(get("from"), 10);
  const toRaw = pickText(get("to"), 10);
  const pageSizeRaw = parseInt(pickText(get("pageSize"), 4) || String(DONOR_PAGE_SIZE), 10);

  return {
    q: pickText(get("q"), 60),
    type: pick(get("type"), DONOR_TYPES, "all"),
    status: pick(get("status"), DONOR_STATUSES, "all"),
    period: pick(get("period"), DONOR_PERIODS, "all"),
    from: DATE_RE.test(fromRaw) ? fromRaw : "",
    to: DATE_RE.test(toRaw) ? toRaw : "",
    sort: pick(get("sort"), DONOR_SORTS, "recent"),
    page: parsePageParam(pickText(get("page"), 6) || undefined),
    pageSize: Number.isFinite(pageSizeRaw)
      ? Math.min(Math.max(pageSizeRaw, 5), DONOR_MAX_PAGE_SIZE)
      : DONOR_PAGE_SIZE,
  };
}

/** 기간 필터가 실제로 적용되는지 + 적용 범위 */
export function resolveDonorPeriod(q: DonorQuery): { from: Date; to: Date; label: string } | null {
  if (q.period === "all") return null;
  if (q.period === "custom") {
    if (!q.from && !q.to) return null;
    return periodRange("custom", { from: q.from, to: q.to });
  }
  return periodRange(q.period as PeriodKey);
}

// ───────────────────────── SQL 조립 ─────────────────────────

/** LIKE 패턴에서 와일드카드를 리터럴로 처리 */
function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function buildWhere(orgId: string, q: DonorQuery, now: Date): Prisma.Sql {
  const parts: Prisma.Sql[] = [
    Prisma.sql`d."organizationId" = ${orgId}`,
    Prisma.sql`d."deletedAt" IS NULL`,
  ];

  const keyword = q.q.trim();
  if (keyword) {
    const like = `%${escapeLike(keyword)}%`;
    const digits = keyword.replace(/[^0-9]/g, "");
    const phoneLike = digits ? `%${digits}%` : null;
    parts.push(Prisma.sql`(
      d.name ILIKE ${like} ESCAPE '\\'
      OR COALESCE(d.email, '') ILIKE ${like} ESCAPE '\\'
      OR (
        ${phoneLike}::text IS NOT NULL
        AND regexp_replace(COALESCE(d.phone, ''), '[^0-9]', '', 'g') LIKE ${phoneLike}
      )
    )`);
  }

  if (q.type === "recurring") {
    parts.push(Prisma.sql`(d."isRecurring" = true OR COALESCE(r.total_cnt, 0) > 0)`);
  } else if (q.type === "onetime") {
    parts.push(Prisma.sql`(d."isRecurring" = false AND COALESCE(r.total_cnt, 0) = 0)`);
  }

  if (q.status === "active") {
    parts.push(Prisma.sql`COALESCE(r.active_cnt, 0) > 0`);
  } else if (q.status === "stopped") {
    parts.push(Prisma.sql`(COALESCE(r.total_cnt, 0) > 0 AND COALESCE(r.active_cnt, 0) = 0)`);
  } else if (q.status === "dormant") {
    // 화면에 "휴면" 배지가 붙는 조건(resolveDonorStatusKey)과 정확히 일치시킨다.
    // 정기후원 이력이 하나라도 있으면 "정기 중단"으로, 후원 이력이 없으면
    // "후원 이력 없음"으로 표시되므로 둘 다 휴면에서 제외한다.
    const threshold = subDays(now, DORMANT_DAYS);
    parts.push(Prisma.sql`(
      COALESCE(r.total_cnt, 0) = 0
      AND a.last_at IS NOT NULL
      AND a.last_at < ${threshold}
    )`);
  } else if (q.status === "new") {
    const monthStart = kstToUtc(startOfMonth(nowKst()));
    parts.push(Prisma.sql`d."createdAt" >= ${monthStart}`);
  }

  const range = resolveDonorPeriod(q);
  if (range) {
    parts.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "Donation" pd
      WHERE pd."donorId" = d.id
        AND pd."deletedAt" IS NULL
        AND pd.status = 'COMPLETED'::"DonationStatus"
        AND pd."donatedAt" >= ${range.from}
        AND pd."donatedAt" <= ${range.to}
    )`);
  }

  return Prisma.join(parts, " AND ");
}

const ORDER_BY: Record<DonorSort, Prisma.Sql> = {
  recent: Prisma.sql`a.last_at DESC NULLS LAST, d."createdAt" DESC, d.id DESC`,
  amount: Prisma.sql`COALESCE(a.total, 0) DESC, d."createdAt" DESC, d.id DESC`,
  count: Prisma.sql`COALESCE(a.cnt, 0) DESC, d."createdAt" DESC, d.id DESC`,
  name: Prisma.sql`d.name ASC, d."createdAt" DESC, d.id DESC`,
  created: Prisma.sql`d."createdAt" DESC, d.id DESC`,
};

function cteFor(orgId: string): Prisma.Sql {
  return Prisma.sql`
    WITH agg AS (
      SELECT dn."donorId" AS donor_id,
             SUM(dn.amount)::float8 AS total,
             COUNT(*)::int AS cnt,
             MIN(dn."donatedAt") AS first_at,
             MAX(dn."donatedAt") AS last_at
      FROM "Donation" dn
      WHERE dn."organizationId" = ${orgId}
        AND dn."deletedAt" IS NULL
        AND dn.status = 'COMPLETED'::"DonationStatus"
        AND dn."donorId" IS NOT NULL
      GROUP BY dn."donorId"
    ),
    rec AS (
      SELECT rd."donorId" AS donor_id,
             (COUNT(*) FILTER (WHERE rd.status = 'ACTIVE'::"RecurringStatus"))::int AS active_cnt,
             COUNT(*)::int AS total_cnt,
             (MAX(rd.amount) FILTER (WHERE rd.status = 'ACTIVE'::"RecurringStatus"))::int AS active_amount
      FROM "RecurringDonation" rd
      WHERE rd."organizationId" = ${orgId}
      GROUP BY rd."donorId"
    )
  `;
}

// ───────────────────────── 결과 타입 ─────────────────────────

export type DonorListItem = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  isRecurring: boolean;
  isLinked: boolean;
  memo: string | null;
  createdAt: Date;
  totalAmount: number;
  donationCount: number;
  firstDonatedAt: Date | null;
  lastDonatedAt: Date | null;
  activeRecurring: number;
  recurringTotal: number;
  activeRecurringAmount: number | null;
};

export type DonorListResult = {
  rows: DonorListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    donorCount: number;
    totalAmount: number;
    recurringCount: number;
    newThisMonth: number;
  };
};

type RawRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  isRecurring: boolean;
  donorAccountId: string | null;
  memo: string | null;
  createdAt: Date;
  total_amount: number;
  donation_count: number;
  first_at: Date | null;
  last_at: Date | null;
  active_recurring: number;
  recurring_total: number;
  active_amount: number | null;
};

/**
 * 조건에 맞는 후원자 목록 + 조회 결과 기준 요약 통계.
 * 목록/요약 모두 동일한 WHERE를 사용하므로 화면의 카드와 표가 항상 일치한다.
 */
export async function fetchOrgDonors(orgId: string, q: DonorQuery): Promise<DonorListResult> {
  const now = new Date();
  const where = buildWhere(orgId, q, now);
  const cte = cteFor(orgId);
  const monthStart = kstToUtc(startOfMonth(nowKst()));
  const skip = (q.page - 1) * q.pageSize;

  const [rawRows, summaryRows] = await Promise.all([
    prisma.$queryRaw<RawRow[]>(Prisma.sql`
      ${cte}
      SELECT d.id, d.name, d.phone, d.email, d."isRecurring", d."donorAccountId",
             d.memo, d."createdAt",
             COALESCE(a.total, 0)::float8 AS total_amount,
             COALESCE(a.cnt, 0)::int      AS donation_count,
             a.first_at, a.last_at,
             COALESCE(r.active_cnt, 0)::int AS active_recurring,
             COALESCE(r.total_cnt, 0)::int  AS recurring_total,
             r.active_amount
      FROM "Donor" d
      LEFT JOIN agg a ON a.donor_id = d.id
      LEFT JOIN rec r ON r.donor_id = d.id
      WHERE ${where}
      ORDER BY ${ORDER_BY[q.sort]}
      LIMIT ${q.pageSize} OFFSET ${skip}
    `),
    prisma.$queryRaw<
      { cnt: number; sum_total: number; recurring_cnt: number; new_cnt: number }[]
    >(Prisma.sql`
      ${cte}
      SELECT COUNT(*)::int AS cnt,
             COALESCE(SUM(COALESCE(a.total, 0)), 0)::float8 AS sum_total,
             (COUNT(*) FILTER (WHERE COALESCE(r.active_cnt, 0) > 0))::int AS recurring_cnt,
             (COUNT(*) FILTER (WHERE d."createdAt" >= ${monthStart}))::int AS new_cnt
      FROM "Donor" d
      LEFT JOIN agg a ON a.donor_id = d.id
      LEFT JOIN rec r ON r.donor_id = d.id
      WHERE ${where}
    `),
  ]);

  const s = summaryRows[0] ?? { cnt: 0, sum_total: 0, recurring_cnt: 0, new_cnt: 0 };
  const total = Number(s.cnt);

  return {
    rows: rawRows.map((r) => ({
      id: String(r.id),
      name: r.name,
      phone: r.phone,
      email: r.email,
      isRecurring: !!r.isRecurring,
      isLinked: !!r.donorAccountId,
      memo: r.memo,
      createdAt: new Date(r.createdAt),
      totalAmount: Number(r.total_amount ?? 0),
      donationCount: Number(r.donation_count ?? 0),
      firstDonatedAt: r.first_at ? new Date(r.first_at) : null,
      lastDonatedAt: r.last_at ? new Date(r.last_at) : null,
      activeRecurring: Number(r.active_recurring ?? 0),
      recurringTotal: Number(r.recurring_total ?? 0),
      activeRecurringAmount: r.active_amount === null ? null : Number(r.active_amount),
    })),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    summary: {
      donorCount: total,
      totalAmount: Number(s.sum_total ?? 0),
      recurringCount: Number(s.recurring_cnt ?? 0),
      newThisMonth: Number(s.new_cnt ?? 0),
    },
  };
}
