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
    const total = g.items.reduce((s, i) => s + i.amount, 0);
    const fee = g.items.reduce((s, i) => s + i.feeAmount, 0);
    const net = total - fee;

    const existing = await prisma.settlement.findUnique({
      where: {
        organizationId_scheduledDate: {
          organizationId: g.organizationId,
          scheduledDate: g.scheduledDate,
        },
      },
    });

    if (!existing) {
      await prisma.$transaction(async (tx) => {
        await tx.settlement.create({
          data: {
            organizationId: g.organizationId,
            period: g.period,
            scheduledDate: g.scheduledDate,
            totalAmount: total,
            feeAmount: fee,
            netAmount: net,
            bankName: g.bankName,
            bankAccount: g.bankAccount,
            bankHolder: g.bankHolder,
            items: {
              create: g.items.map((i) => ({
                donationId: i.donationId,
                amount: i.amount,
                channel: i.channel,
                donatedAt: i.donatedAt,
              })),
            },
          },
        });
      });
      created++;
    } else {
      const linked = await prisma.settlementItem.findMany({
        where: { donationId: { in: g.items.map((i) => i.donationId) } },
        select: { donationId: true },
      });
      const linkedIds = new Set(linked.map((i) => i.donationId));
      const newItems = g.items.filter((i) => !linkedIds.has(i.donationId));
      if (newItems.length === 0) continue;

      const addTotal = newItems.reduce((s, i) => s + i.amount, 0);
      const addFee = newItems.reduce((s, i) => s + i.feeAmount, 0);
      const addNet = addTotal - addFee;

      await prisma.$transaction([
        prisma.settlementItem.createMany({
          data: newItems.map((i) => ({
            settlementId: existing.id,
            donationId: i.donationId,
            amount: i.amount,
            channel: i.channel,
            donatedAt: i.donatedAt,
          })),
        }),
        prisma.settlement.update({
          where: { id: existing.id },
          data: {
            totalAmount: { increment: addTotal },
            feeAmount: { increment: addFee },
            netAmount: { increment: addNet },
          },
        }),
      ]);
      updated++;
    }
  }

  return { created, updated };
}
