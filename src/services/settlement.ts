import { addMonths, addDays, setDate, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { KST, kstToUtc, fmtKst } from "@/lib/kst-date";

/** 채널별 정산 규칙 (플랫폼 전역) */
export type SettlementRuleValue = {
  ruleType: "DAYS" | "MONTHS";
  offsetValue: number;
  anchorDay: number | null;
};

/** 기본 규칙 (관리자가 미설정한 채널 / 마이그레이션 전 폴백) — 기존 동작과 동일 */
export const DEFAULT_SETTLEMENT_RULES: Record<string, SettlementRuleValue> = {
  SMS: { ruleType: "MONTHS", offsetValue: 3, anchorDay: 16 },
  EASY_TRANSFER: { ruleType: "MONTHS", offsetValue: 1, anchorDay: 16 },
  RECURRING_TRANSFER: { ruleType: "MONTHS", offsetValue: 1, anchorDay: 16 },
  RECURRING_CARD: { ruleType: "MONTHS", offsetValue: 1, anchorDay: 16 },
};

/** DB의 채널별 규칙을 기본값과 병합해 로드 */
export async function loadSettlementRules(): Promise<Map<string, SettlementRuleValue>> {
  const map = new Map<string, SettlementRuleValue>(Object.entries(DEFAULT_SETTLEMENT_RULES));
  try {
    const rows = await prisma.settlementRule.findMany();
    for (const r of rows) {
      map.set(r.channel, {
        ruleType: r.ruleType as "DAYS" | "MONTHS",
        offsetValue: r.offsetValue,
        anchorDay: r.anchorDay ?? null,
      });
    }
  } catch {
    // 마이그레이션 전: 기본값 사용
  }
  return map;
}

/**
 * 규칙에 따른 정산 예정일 계산 (KST 기준, 자정으로 정규화)
 * - DAYS:  후원일 + offsetValue 일
 * - MONTHS: offsetValue 개월 후 anchorDay 일 (1~28)
 * KST 벽시계로 계산 후 UTC로 변환. 같은 날짜는 동일 인스턴트가 되어 그룹핑에 사용된다.
 */
export function calcSettlementDate(rule: SettlementRuleValue, donatedAt: Date): Date {
  const kst = toZonedTime(donatedAt, KST);
  let d: Date;
  if (rule.ruleType === "DAYS") {
    d = startOfDay(addDays(kst, Math.max(0, rule.offsetValue)));
  } else {
    const base = addMonths(kst, Math.max(0, rule.offsetValue));
    const day = Math.min(Math.max(rule.anchorDay ?? 16, 1), 28);
    d = startOfDay(setDate(base, day));
  }
  return kstToUtc(d);
}

/** 정산 기간 레이블: "2026-04" (KST 기준, 예정일의 월) */
export function settlementPeriod(date: Date): string {
  return fmtKst(date, "yyyy-MM");
}

/**
 * 기관별 채널별 수수료율 맵 반환 (기본값 5%)
 */
async function loadFeeMap(organizationIds: string[]): Promise<Map<string, Map<string, number>>> {
  if (organizationIds.length === 0) return new Map();
  let fees: { organizationId: string; channel: string; feePercent: number }[] = [];
  try {
    fees = await prisma.organizationFee.findMany({
      where: { organizationId: { in: organizationIds } },
      select: { organizationId: true, channel: true, feePercent: true },
    });
  } catch {
    // 마이그레이션 전이면 빈 배열 → 기본 5%
  }
  const map = new Map<string, Map<string, number>>();
  for (const f of fees) {
    if (!map.has(f.organizationId)) map.set(f.organizationId, new Map());
    map.get(f.organizationId)!.set(f.channel, f.feePercent);
  }
  return map;
}

function getFeePercent(
  feeMap: Map<string, Map<string, number>>,
  organizationId: string,
  channel: string
): number {
  return feeMap.get(organizationId)?.get(channel) ?? 5.0;
}

/**
 * 미처리 후원 건에 대해 정산 데이터 생성/갱신
 * - COMPLETED · 아직 SettlementItem 없는 건 처리
 * - 채널별 정산규칙으로 정산예정일 계산 → (기관, 정산예정일) 단위로 묶음
 */
export async function generateSettlements(organizationId?: string) {
  const donations = await prisma.donation.findMany({
    where: {
      status: "COMPLETED",
      deletedAt: null,
      settlementItems: { none: {} },
      organizationId: { not: null },
      ...(organizationId ? { organizationId } : {}),
    },
    include: {
      organization: {
        select: { id: true, bankName: true, bankAccount: true, bankHolder: true },
      },
    },
    orderBy: { donatedAt: "asc" },
  });

  if (donations.length === 0) return { created: 0, updated: 0 };

  const orgIds = [...new Set(donations.map((d) => d.organizationId).filter((id): id is string => id !== null))];
  const [feeMap, rules] = await Promise.all([loadFeeMap(orgIds), loadSettlementRules()]);

  type GroupKey = string; // `${organizationId}::${scheduledDate ISO}`
  const groups = new Map<
    GroupKey,
    {
      organizationId: string;
      period: string;
      scheduledDate: Date;
      items: { donationId: string; amount: number; channel: string; donatedAt: Date; feeAmount: number }[];
      bankName: string | null;
      bankAccount: string | null;
      bankHolder: string | null;
    }
  >();

  for (const d of donations) {
    if (!d.organizationId) continue;

    const rule = rules.get(d.channel) ?? DEFAULT_SETTLEMENT_RULES[d.channel] ?? DEFAULT_SETTLEMENT_RULES.EASY_TRANSFER;
    const settled = calcSettlementDate(rule, d.donatedAt);
    const period = settlementPeriod(settled);
    const key: GroupKey = `${d.organizationId}::${settled.toISOString()}`;

    if (!groups.has(key)) {
      groups.set(key, {
        organizationId: d.organizationId,
        period,
        scheduledDate: settled,
        items: [],
        bankName: d.organization?.bankName ?? null,
        bankAccount: d.organization?.bankAccount ?? null,
        bankHolder: d.organization?.bankHolder ?? null,
      });
    }

    const feePercent = getFeePercent(feeMap, d.organizationId, d.channel);
    const donationFee = Math.round((d.amount * feePercent) / 100);

    groups.get(key)!.items.push({
      donationId: d.id,
      amount: d.amount,
      channel: d.channel,
      donatedAt: d.donatedAt,
      feeAmount: donationFee,
    });
  }

  let created = 0;
  let updated = 0;

  for (const g of groups.values()) {
    // 이미 다른 정산에 연결된 후원 건 제외 (빈 정산 레코드가 만들어지지 않도록 먼저 확인)
    const linked = await prisma.settlementItem.findMany({
      where: { donationId: { in: g.items.map((i) => i.donationId) } },
      select: { donationId: true },
    });
    const linkedIds = new Set(linked.map((i) => i.donationId));
    const newItems = g.items.filter((i) => !linkedIds.has(i.donationId));
    if (newItems.length === 0) continue;

    // C-2: 이미 지급됐거나 처리 중인 정산에는 금액을 사후 가산하지 않는다.
    //      해당 일자가 잠겨 있으면 뒤로 밀어 별도의 "차기 정산"으로 분리한다.
    const target = await resolveOpenSettlement(g);
    if (!target) {
      console.warn(
        `[settlement] 열린 정산 일자를 찾지 못해 건너뜀 (org=${g.organizationId}, date=${g.scheduledDate.toISOString()})`
      );
      continue;
    }

    let addedCount = 0;
    for (const i of newItems) {
      // M-2 동시성: SettlementItem 생성(donationId unique)과 합계 가산을 한 트랜잭션으로 묶는다.
      // 다른 프로세스가 먼저 연결했다면 P2002로 전체가 롤백되어 이중 가산이 발생하지 않는다.
      try {
        await prisma.$transaction([
          prisma.settlementItem.create({
            data: {
              settlementId: target.id,
              donationId: i.donationId,
              amount: i.amount,
              channel: i.channel,
              donatedAt: i.donatedAt,
            },
          }),
          prisma.settlement.update({
            where: { id: target.id },
            data: {
              totalAmount: { increment: i.amount },
              feeAmount: { increment: i.feeAmount },
              netAmount: { increment: i.amount - i.feeAmount },
            },
          }),
        ]);
        addedCount++;
      } catch (e) {
        if ((e as { code?: string })?.code === "P2002") continue; // 동시 실행이 먼저 연결함
        throw e;
      }
    }

    if (addedCount === 0) {
      // 동시 실행이 모든 건을 먼저 가져간 경우 — 방금 만든 빈 정산은 정리한다.
      if (target.isNew) {
        await prisma.settlement.deleteMany({ where: { id: target.id, items: { none: {} }, totalAmount: 0 } });
      }
      continue;
    }
    if (target.isNew) created++;
    else updated++;
  }

  return { created, updated };
}

/** 금액을 가산할 수 있는 정산 상태 (지급 완료·처리 중에는 가산 금지) */
const LOCKED_SETTLEMENT_STATUS = new Set(["PROCESSING", "COMPLETED", "CANCELLED"]);

/** 잠긴 일자를 만났을 때 차기 정산일을 찾기 위해 뒤로 밀어보는 최대 일수 */
const MAX_DEFER_DAYS = 60;

/**
 * 가산 가능한(PENDING) 정산 레코드를 확보한다.
 *
 * 1) 예정일에 정산이 없으면 금액 0으로 생성 (M-2: upsert로 동시 생성 경합 제거)
 * 2) 있으나 PENDING 이면 그대로 사용
 * 3) PROCESSING/COMPLETED/CANCELLED 로 잠겨 있으면 하루씩 미뤄 별도 정산으로 분리
 */
async function resolveOpenSettlement(g: {
  organizationId: string;
  scheduledDate: Date;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
}): Promise<{ id: string; isNew: boolean } | null> {
  for (let offset = 0; offset <= MAX_DEFER_DAYS; offset++) {
    const scheduledDate = offset === 0 ? g.scheduledDate : addDays(g.scheduledDate, offset);

    const existing = await prisma.settlement.findUnique({
      where: {
        organizationId_scheduledDate: { organizationId: g.organizationId, scheduledDate },
      },
      select: { id: true, status: true },
    });

    if (existing) {
      if (LOCKED_SETTLEMENT_STATUS.has(existing.status)) continue; // 잠김 → 차기 일자로
      return { id: existing.id, isNew: false };
    }

    // 동시 실행 시 한쪽만 create 되도록 upsert 사용 (update는 no-op)
    const settlement = await prisma.settlement.upsert({
      where: {
        organizationId_scheduledDate: { organizationId: g.organizationId, scheduledDate },
      },
      update: {},
      create: {
        organizationId: g.organizationId,
        period: settlementPeriod(scheduledDate),
        scheduledDate,
        totalAmount: 0,
        feeAmount: 0,
        netAmount: 0,
        bankName: g.bankName,
        bankAccount: g.bankAccount,
        bankHolder: g.bankHolder,
        ...(offset > 0
          ? { note: `이전 정산일(${fmtKst(g.scheduledDate, "yyyy-MM-dd")})이 마감되어 분리된 차기 정산` }
          : {}),
      },
      select: { id: true, status: true },
    });

    // upsert가 기존 행을 반환했을 수 있으므로 상태를 다시 확인
    if (LOCKED_SETTLEMENT_STATUS.has(settlement.status)) continue;
    return { id: settlement.id, isNew: true };
  }
  return null;
}
