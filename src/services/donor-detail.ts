/**
 * 후원자 상세 데이터 집계.
 *
 * 기관 스코프(organizationId)를 반드시 함께 조회해 타 기관 후원자 ID로
 * 접근하는 것을 차단한다. 페이지와 API가 동일한 함수를 사용한다.
 */
import { subMonths, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { fmtKst, kstToUtc, nowKst } from "@/lib/kst-date";
import { maskPhone, maskEmail } from "@/lib/masking";
import { resolveDonorStatus } from "@/lib/donor-status";
import { CHANNEL_META, ALL_CHANNELS, type DonationChannelKey } from "@/lib/donation-page";

/** 후원 내역 표 한 페이지 크기 */
export const DONATION_HISTORY_PAGE_SIZE = 20;

/** 통계 집계에 사용할 완료 후원 최대 건수 (비정상 데이터로 인한 과다 로딩 방지) */
const STATS_FETCH_LIMIT = 20_000;

export type DonorDetail = Awaited<ReturnType<typeof getDonorDetail>>;

export async function getDonorDetail(
  orgId: string,
  donorId: string,
  opts: { historyPage?: number; months?: number } = {}
) {
  const historyPage = Math.max(1, opts.historyPage ?? 1);
  const months = Math.min(Math.max(opts.months ?? 12, 1), 60);

  const donor = await prisma.donor.findFirst({
    where: { id: donorId, organizationId: orgId, deletedAt: null },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      memo: true,
      isRecurring: true,
      privacyConsent: true,
      donorAccountId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!donor) return null;

  const completedWhere = {
    donorId: donor.id,
    organizationId: orgId,
    status: "COMPLETED" as const,
    deletedAt: null,
  };
  const historyWhere = { donorId: donor.id, organizationId: orgId, deletedAt: null };

  const [completed, history, historyTotal, recurrings, account] = await Promise.all([
    prisma.donation.findMany({
      where: completedWhere,
      select: { amount: true, donatedAt: true, channel: true },
      orderBy: { donatedAt: "desc" },
      take: STATS_FETCH_LIMIT,
    }),
    prisma.donation.findMany({
      where: historyWhere,
      select: {
        id: true,
        amount: true,
        channel: true,
        status: true,
        donatedAt: true,
        memo: true,
        campaign: { select: { title: true } },
      },
      orderBy: [{ donatedAt: "desc" }, { id: "desc" }],
      skip: (historyPage - 1) * DONATION_HISTORY_PAGE_SIZE,
      take: DONATION_HISTORY_PAGE_SIZE,
    }),
    prisma.donation.count({ where: historyWhere }),
    prisma.recurringDonation.findMany({
      where: { donorId: donor.id, organizationId: orgId },
      select: {
        id: true,
        amount: true,
        dayOfMonth: true,
        method: true,
        status: true,
        startedAt: true,
        cancelledAt: true,
        billingKey: { select: { cardIssuer: true, cardLast4: true } },
      },
      orderBy: [{ status: "asc" }, { startedAt: "desc" }],
    }),
    donor.donorAccountId
      ? prisma.donorAccount.findUnique({
          where: { id: donor.donorAccountId },
          select: { provider: true, name: true, lastLoginAt: true },
        })
      : Promise.resolve(null),
  ]);

  // ── 요약 지표 ──────────────────────────────────────────────
  const totalAmount = completed.reduce((s, d) => s + d.amount, 0);
  const donationCount = completed.length;
  const avgAmount = donationCount > 0 ? Math.round(totalAmount / donationCount) : 0;
  const maxAmount = donationCount > 0 ? Math.max(...completed.map((d) => d.amount)) : 0;
  // orderBy donatedAt desc 이므로 첫 원소가 최근, 마지막 원소가 최초
  const lastDonatedAt = completed[0]?.donatedAt ?? null;
  const firstDonatedAt = completed[donationCount - 1]?.donatedAt ?? null;

  // ── 월별 시계열 (최근 N개월, 빈 달은 0으로 채움) ─────────────
  const now = nowKst();
  const monthlyMap = new Map<string, { amount: number; count: number }>();
  for (let i = months - 1; i >= 0; i--) {
    monthlyMap.set(fmtKst(kstToUtc(subMonths(now, i)), "yyyy-MM"), { amount: 0, count: 0 });
  }
  const monthlyFrom = kstToUtc(startOfMonth(subMonths(now, months - 1)));
  for (const d of completed) {
    if (d.donatedAt < monthlyFrom) continue;
    const key = fmtKst(d.donatedAt, "yyyy-MM");
    const cur = monthlyMap.get(key);
    if (cur) {
      cur.amount += d.amount;
      cur.count += 1;
    }
  }
  const monthly = Array.from(monthlyMap.entries()).map(([month, v]) => ({
    month,
    // 차트 축 라벨을 짧게 (2026-03 → 26.03)
    label: `${month.slice(2, 4)}.${month.slice(5, 7)}`,
    amount: v.amount,
    count: v.count,
  }));

  // ── 채널별 분포 ───────────────────────────────────────────
  const channelMap = new Map<string, { amount: number; count: number }>();
  for (const d of completed) {
    const cur = channelMap.get(d.channel) ?? { amount: 0, count: 0 };
    cur.amount += d.amount;
    cur.count += 1;
    channelMap.set(d.channel, cur);
  }
  const channels = ALL_CHANNELS.map((ch: DonationChannelKey) => ({
    channel: ch,
    name: CHANNEL_META[ch].label,
    short: CHANNEL_META[ch].short,
    amount: channelMap.get(ch)?.amount ?? 0,
    count: channelMap.get(ch)?.count ?? 0,
  }));

  // ── 연도별 합계 (기부금영수증 대상 금액) ─────────────────────
  const yearMap = new Map<string, { amount: number; count: number }>();
  for (const d of completed) {
    const y = fmtKst(d.donatedAt, "yyyy");
    const cur = yearMap.get(y) ?? { amount: 0, count: 0 };
    cur.amount += d.amount;
    cur.count += 1;
    yearMap.set(y, cur);
  }
  const yearly = Array.from(yearMap.entries())
    .map(([year, v]) => ({ year, ...v }))
    .sort((a, b) => b.year.localeCompare(a.year));

  const activeRecurring = recurrings.filter((r) => r.status === "ACTIVE");
  const status = resolveDonorStatus({
    activeRecurring: activeRecurring.length,
    recurringTotal: recurrings.length,
    lastDonatedAt,
  });

  return {
    donor: {
      id: donor.id,
      name: donor.name,
      // 원본 연락처가 RSC 직렬화/응답 본문으로 노출되지 않도록 서버에서 마스킹
      phone: maskPhone(donor.phone),
      email: maskEmail(donor.email),
      hasPhone: !!donor.phone,
      hasEmail: !!donor.email,
      memo: donor.memo,
      isRecurring: donor.isRecurring,
      privacyConsent: donor.privacyConsent,
      isLinked: !!donor.donorAccountId,
      accountProvider: account?.provider ?? null,
      accountLastLoginAt: account?.lastLoginAt ? fmtKst(account.lastLoginAt, "yyyy-MM-dd HH:mm") : null,
      createdAt: fmtKst(donor.createdAt, "yyyy-MM-dd"),
      updatedAt: fmtKst(donor.updatedAt, "yyyy-MM-dd HH:mm"),
    },
    status,
    summary: {
      totalAmount,
      donationCount,
      avgAmount,
      maxAmount,
      firstDonatedAt: firstDonatedAt ? fmtKst(firstDonatedAt, "yyyy-MM-dd") : null,
      lastDonatedAt: lastDonatedAt ? fmtKst(lastDonatedAt, "yyyy-MM-dd") : null,
      activeRecurringCount: activeRecurring.length,
      activeRecurringAmount: activeRecurring.reduce((s, r) => s + r.amount, 0),
      truncated: donationCount >= STATS_FETCH_LIMIT,
    },
    monthly,
    channels,
    yearly,
    recurrings: recurrings.map((r) => ({
      id: r.id,
      amount: r.amount,
      dayOfMonth: r.dayOfMonth,
      method: r.method,
      methodLabel: r.method === "CARD" ? "신용카드" : "계좌 자동이체",
      status: r.status,
      startedAt: fmtKst(r.startedAt, "yyyy-MM-dd"),
      cancelledAt: r.cancelledAt ? fmtKst(r.cancelledAt, "yyyy-MM-dd") : null,
      card:
        r.billingKey?.cardLast4
          ? `${r.billingKey.cardIssuer ?? "카드"} ****${r.billingKey.cardLast4}`
          : null,
    })),
    history: {
      rows: history.map((d) => ({
        id: d.id,
        amount: d.amount,
        channel: d.channel,
        status: d.status,
        donatedAt: fmtKst(d.donatedAt, "yyyy-MM-dd HH:mm"),
        campaignTitle: d.campaign?.title ?? null,
        memo: d.memo,
      })),
      total: historyTotal,
      page: historyPage,
      pageSize: DONATION_HISTORY_PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(historyTotal / DONATION_HISTORY_PAGE_SIZE)),
    },
  };
}

/** 월별 후원 집계만 필요한 경우 (통계 API 용) */
export async function getDonorMonthlyStats(orgId: string, donorId: string, months = 12) {
  const detail = await getDonorDetail(orgId, donorId, { months, historyPage: 1 });
  if (!detail) return null;
  return {
    donorId,
    months,
    monthly: detail.monthly,
    channels: detail.channels,
    yearly: detail.yearly,
    summary: detail.summary,
  };
}
