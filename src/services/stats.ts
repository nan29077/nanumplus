import { prisma } from "@/lib/prisma";
import { fmtKst, kstToUtc, nowKst, periodRange, type PeriodKey } from "@/lib/kst-date";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths, eachDayOfInterval, startOfWeek, endOfWeek } from "date-fns";
import type { Prisma } from "@prisma/client";

type Scope = { organizationId?: string };

const completed = (scope: Scope): Prisma.DonationWhereInput => ({
  ...scope,
  status: "COMPLETED",
  deletedAt: null,
});

export async function getDashboardStats(scope: Scope) {
  const now = nowKst();
  const todayRange = { gte: kstToUtc(startOfDay(now)), lte: kstToUtc(endOfDay(now)) };
  const monthRange = { gte: kstToUtc(startOfMonth(now)), lte: kstToUtc(endOfMonth(now)) };

  const [total, month, today, donorCount, byChannel, activeCampaigns] = await Promise.all([
    prisma.donation.aggregate({ where: completed(scope), _sum: { amount: true } }),
    prisma.donation.aggregate({ where: { ...completed(scope), donatedAt: monthRange }, _sum: { amount: true } }),
    prisma.donation.aggregate({ where: { ...completed(scope), donatedAt: todayRange }, _sum: { amount: true } }),
    prisma.donor.count({ where: { ...scope, deletedAt: null } }),
    prisma.donation.groupBy({
      by: ["channel"],
      where: completed(scope),
      _sum: { amount: true },
    }),
    prisma.campaign.count({
      where: { ...scope, status: "ACTIVE", isPublished: true, deletedAt: null },
    }),
  ]);

  const channelSum = (c: string) =>
    byChannel.find((x) => x.channel === c)?._sum.amount ?? 0;

  return {
    totalAmount: total._sum.amount ?? 0,
    monthAmount: month._sum.amount ?? 0,
    todayAmount: today._sum.amount ?? 0,
    donorCount,
    smsAmount: channelSum("SMS"),
    easyTransferAmount: channelSum("EASY_TRANSFER"),
    // M-5: 카드 정기후원(RECURRING_CARD)이 어느 지표에도 잡히지 않아 대시보드 합계가 어긋났다.
    recurringAmount: channelSum("RECURRING_TRANSFER") + channelSum("RECURRING_CARD"),
    recurringTransferAmount: channelSum("RECURRING_TRANSFER"),
    recurringCardAmount: channelSum("RECURRING_CARD"),
    activeCampaigns,
  };
}

/** 일별 모금액 (라인 차트) */
export async function getDailySeries(scope: Scope, days = 30) {
  const now = nowKst();
  const from = kstToUtc(startOfDay(subDays(now, days - 1)));
  const rows = await prisma.donation.findMany({
    where: { ...completed(scope), donatedAt: { gte: from } },
    select: { amount: true, donatedAt: true },
  });
  const map = new Map<string, number>();
  for (const d of eachDayOfInterval({ start: subDays(now, days - 1), end: now })) {
    map.set(fmtKst(kstToUtc(d), "MM-dd"), 0);
  }
  for (const r of rows) {
    const key = fmtKst(r.donatedAt, "MM-dd");
    map.set(key, (map.get(key) ?? 0) + r.amount);
  }
  return Array.from(map.entries()).map(([date, amount]) => ({ date, amount }));
}

/** 월별 모금액 (바 차트, 최근 12개월) */
export async function getMonthlySeries(scope: Scope, months = 12) {
  const now = nowKst();
  const from = kstToUtc(startOfMonth(subMonths(now, months - 1)));
  const rows = await prisma.donation.findMany({
    where: { ...completed(scope), donatedAt: { gte: from } },
    select: { amount: true, donatedAt: true },
  });
  const map = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) {
    map.set(fmtKst(kstToUtc(subMonths(now, i)), "yyyy-MM"), 0);
  }
  for (const r of rows) {
    const key = fmtKst(r.donatedAt, "yyyy-MM");
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + r.amount);
  }
  return Array.from(map.entries()).map(([month, amount]) => ({ month, amount }));
}

/** 채널별 비중 (도넛 차트) */
export async function getChannelBreakdown(scope: Scope, period?: PeriodKey) {
  const range = period ? periodRange(period) : null;
  const rows = await prisma.donation.groupBy({
    by: ["channel"],
    where: {
      ...completed(scope),
      ...(range ? { donatedAt: { gte: range.from, lte: range.to } } : {}),
    },
    _sum: { amount: true },
    _count: true,
  });
  const labels: Record<string, string> = {
    SMS: "문자후원",
    EASY_TRANSFER: "간편 계좌이체",
    RECURRING_TRANSFER: "정기후원",
    RECURRING_CARD: "카드 정기후원",
  };
  return rows.map((r) => ({
    channel: r.channel,
    name: labels[r.channel],
    amount: r._sum.amount ?? 0,
    count: r._count,
  }));
}

/** 대시보드 추가 지표 (신규 후원자, 이번주, 지난주 비교 등) */
export async function getDashboardExtra(scope: Scope) {
  const now = nowKst();
  const monthRange = { gte: kstToUtc(startOfMonth(now)), lte: kstToUtc(endOfMonth(now)) };
  const lastMonthRange = {
    gte: kstToUtc(startOfMonth(subMonths(now, 1))),
    lte: kstToUtc(endOfMonth(subMonths(now, 1))),
  };
  const weekRange = {
    gte: kstToUtc(startOfWeek(now, { weekStartsOn: 1 })),
    lte: kstToUtc(endOfWeek(now, { weekStartsOn: 1 })),
  };
  const lastWeekRange = {
    gte: kstToUtc(startOfWeek(subDays(now, 7), { weekStartsOn: 1 })),
    lte: kstToUtc(endOfWeek(subDays(now, 7), { weekStartsOn: 1 })),
  };

  const [
    newDonorsThisMonth,
    monthDonationCount,
    lastMonthDonationCount,
    weekAmount,
    lastWeekAmount,
    recurringCount,
  ] = await Promise.all([
    prisma.donor.count({
      where: { ...scope, deletedAt: null, createdAt: monthRange },
    }),
    prisma.donation.count({ where: { ...completed(scope), donatedAt: monthRange } }),
    prisma.donation.count({ where: { ...completed(scope), donatedAt: lastMonthRange } }),
    prisma.donation.aggregate({
      where: { ...completed(scope), donatedAt: weekRange },
      _sum: { amount: true },
    }),
    prisma.donation.aggregate({
      where: { ...completed(scope), donatedAt: lastWeekRange },
      _sum: { amount: true },
    }),
    prisma.donor.count({ where: { ...scope, deletedAt: null, isRecurring: true } }),
  ]);

  const weekAmt = weekAmount._sum.amount ?? 0;
  const lastWeekAmt = lastWeekAmount._sum.amount ?? 0;
  const weekGrowth =
    lastWeekAmt === 0
      ? weekAmt > 0 ? 100 : 0
      : Math.round(((weekAmt - lastWeekAmt) / lastWeekAmt) * 100);

  const monthGrowth =
    lastMonthDonationCount === 0
      ? monthDonationCount > 0 ? 100 : 0
      : Math.round(
          ((monthDonationCount - lastMonthDonationCount) / lastMonthDonationCount) * 100
        );

  return {
    newDonorsThisMonth,
    monthDonationCount,
    lastMonthDonationCount,
    monthGrowth,
    weekAmount: weekAmt,
    lastWeekAmount: lastWeekAmt,
    weekGrowth,
    recurringCount,
  };
}

/** 상위 후원자 (금액순) */
export async function getTopDonors(scope: Scope, limit = 5) {
  const rows = await prisma.donation.groupBy({
    by: ["donorId"],
    where: completed(scope),
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: "desc" } },
    take: limit,
  });
  const donorIds = rows.map((r) => r.donorId).filter((id): id is string => id !== null);
  const donors = await prisma.donor.findMany({
    where: { id: { in: donorIds } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(donors.map((d) => [d.id, d.name]));
  return rows.map((r) => ({
    donorId: r.donorId ?? "",
    name: r.donorId ? (nameMap.get(r.donorId) ?? "이름 없음") : "이름 없음",
    totalAmount: r._sum.amount ?? 0,
    count: r._count,
  }));
}

/** 진행 중 캠페인 진척률 */
export async function getActiveCampaignProgress(scope: Scope, limit = 5) {
  const campaigns = await prisma.campaign.findMany({
    where: { ...scope, status: "ACTIVE", isPublished: true, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      goalAmount: true,
      currentAmount: true,
      endDate: true,
    },
  });
  return campaigns.map((c) => ({
    id: c.id,
    title: c.title,
    goalAmount: c.goalAmount ?? 0,
    currentAmount: c.currentAmount ?? 0,
    progress:
      c.goalAmount && c.goalAmount > 0
        ? Math.min(100, Math.round(((c.currentAmount ?? 0) / c.goalAmount) * 100))
        : 0,
    endDate: c.endDate ? fmtKst(c.endDate, "yyyy-MM-dd") : null,
  }));
}

/** 기간 리포트 */
export async function getPeriodReport(
  scope: Scope,
  period: PeriodKey,
  custom?: { from: string; to: string }
) {
  const range = periodRange(period, custom);
  const where = { ...completed(scope), donatedAt: { gte: range.from, lte: range.to } };
  const [agg, byChannel, count] = await Promise.all([
    prisma.donation.aggregate({ where, _sum: { amount: true }, _avg: { amount: true } }),
    prisma.donation.groupBy({ by: ["channel"], where, _sum: { amount: true }, _count: true }),
    prisma.donation.count({ where }),
  ]);
  return {
    label: range.label,
    from: fmtKst(range.from, "yyyy-MM-dd"),
    to: fmtKst(range.to, "yyyy-MM-dd"),
    totalAmount: agg._sum.amount ?? 0,
    avgAmount: Math.round(agg._avg.amount ?? 0),
    count,
    byChannel,
  };
}
