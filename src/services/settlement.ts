import { addMonths, setDate } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { KST, kstToUtc, fmtKst } from "@/lib/kst-date";

/**
 * 후원 채널에 따른 정산 예정일 계산 (KST 기준)
 * - SMS: 후원일 + 3개월 후 16일
 * - EASY_TRANSFER / RECURRING_TRANSFER: 다음달 16일
 * 월/일 계산을 KST 벽시계 기준으로 수행한 뒤 UTC로 변환해 저장한다.
 */
export function calcSettlementDate(channel: string, donatedAt: Date): Date {
  const kst = toZonedTime(donatedAt, KST);
  const base = channel === "SMS" ? addMonths(kst, 3) : addMonths(kst, 1);
  return kstToUtc(setDate(base, 16));
}

/**
 * 정산 기간 레이블: "2026-04" 형식 (KST 기준)
 */
export function settlementPeriod(date: Date): string {
  return fmtKst(date, "yyyy-MM");
}

/**
 * 기관별 채널별 수수료율 맵 반환 (기본값 5%)
 * Map<organizationId, Map<channel, feePercent>>
 */
async function loadFeeMap(organizationIds: string[]): Promise<Map<string, Map<string, number>>> {
  if (organizationIds.length === 0) return new Map();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fees: { organizationId: string; channel: string; feePercent: number }[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fees = await (prisma as any).organizationFee.findMany({
      where: { organizationId: { in: organizationIds } },
      select: { organizationId: true, channel: true, feePercent: true },
    });
  } catch {
    // 마이그레이션 전이라면 빈 배열 → 기본 5% 적용
  }

  const map = new Map<string, Map<string, number>>();
  for (const f of fees) {
    if (!map.has(f.organizationId)) map.set(f.organizationId, new Map());
    map.get(f.organizationId)!.set(f.channel, f.feePercent);
  }
  return map;
}

/** 채널 수수료율 조회 (없으면 기본 5%) */
function getFeePercent(
  feeMap: Map<string, Map<string, number>>,
  organizationId: string,
  channel: string
): number {
  return feeMap.get(organizationId)?.get(channel) ?? 5.0;
}

/**
 * 미처리 후원 건에 대해 정산 데이터 생성/갱신
 * - COMPLETED 상태의 후원 건 중 아직 SettlementItem이 없는 것들을 처리
 * - organizationId를 지정하면 해당 기관만, null이면 전체
 * - 채널별 수수료율은 OrganizationFee 테이블에서 읽음 (없으면 5%)
 */
export async function generateSettlements(organizationId?: string) {
  // 아직 정산 항목이 없는 완료된 후원 조회
  const donations = await prisma.donation.findMany({
    where: {
      status: "COMPLETED",
      deletedAt: null,
      settlementItems: { none: {} },
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

  // 기관 ID 목록 수집 후 수수료 맵 로드
  const orgIds = [...new Set(donations.map((d) => d.organizationId).filter((id): id is string => id !== null))];
  const feeMap = await loadFeeMap(orgIds);

  // 기관 + 기간 별로 그루핑
  type GroupKey = string; // `${organizationId}::${period}`
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
    const settled = calcSettlementDate(d.channel, d.donatedAt);
    const period = settlementPeriod(settled);
    const key: GroupKey = `${d.organizationId}::${period}`;

    if (!groups.has(key)) {
      groups.set(key, {
        organizationId: d.organizationId!,
        period,
        scheduledDate: settled,
        items: [],
        bankName: d.organization?.bankName ?? null,
        bankAccount: d.organization?.bankAccount ?? null,
        bankHolder: d.organization?.bankHolder ?? null,
      });
    }

    const feePercent = getFeePercent(feeMap, d.organizationId ?? "", d.channel);
    const donationFee = Math.round(d.amount * feePercent / 100);

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
      where: { organizationId_period: { organizationId: g.organizationId, period: g.period } },
    });

    if (!existing) {
      const s = await prisma.settlement.create({
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
      void s;
      created++;
    } else {
      // 기존 정산에 새 항목 추가
      await prisma.settlementItem.createMany({
        data: g.items.map((i) => ({
          settlementId: existing.id,
          donationId: i.donationId,
          amount: i.amount,
          channel: i.channel,
          donatedAt: i.donatedAt,
        })),
        skipDuplicates: true,
      });
      await prisma.settlement.update({
        where: { id: existing.id },
        data: {
          totalAmount: existing.totalAmount + total,
          feeAmount: existing.feeAmount + fee,
          netAmount: existing.netAmount + net,
        },
      });
      updated++;
    }
  }

  return { created, updated };
}
