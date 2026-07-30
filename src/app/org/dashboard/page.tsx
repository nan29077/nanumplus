import {
  Wallet, CalendarDays, Sun, Users, MessageSquare, Landmark, RefreshCw, Megaphone,
  TrendingUp, TrendingDown, Minus, UserPlus, ArrowRight, Trophy, Target,
} from "lucide-react";
import Link from "next/link";
import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  getDashboardStats, getDailySeries, getMonthlySeries,
  getChannelBreakdown, getDashboardExtra, getTopDonors, getActiveCampaignProgress,
} from "@/services/stats";
import { getMonthlyCalendar } from "@/services/calendar";
import { nowKst } from "@/lib/kst-date";
import { OrgLayout } from "@/components/layout/org-layout";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DailyLineChart, MonthlyBarChart, ChannelDonutChart } from "@/components/charts/client-charts";
import { DonationTable } from "@/components/donation/donation-table";
import { DashboardCalendar } from "@/components/donation/dashboard-calendar";
import { toDonationRow } from "@/lib/format-donation";
import { formatKRW } from "@/lib/utils";

export const dynamic = "force-dynamic";

const EMPTY_STATS = {
  totalAmount: 0, monthAmount: 0, todayAmount: 0, donorCount: 0,
  smsAmount: 0, easyTransferAmount: 0, recurringAmount: 0, activeCampaigns: 0,
};
const EMPTY_EXTRA = {
  newDonorsThisMonth: 0, monthDonationCount: 0, lastMonthDonationCount: 0,
  monthGrowth: 0, weekAmount: 0, lastWeekAmount: 0, weekGrowth: 0, recurringCount: 0,
};

function GrowthBadge({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-brand-600">
        <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />+{value}%
      </span>
    );
  if (value < 0)
    return (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-rose-500">
        <TrendingDown className="h-3.5 w-3.5" strokeWidth={2} />
        {value}%
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-xs text-stone-400">
      <Minus className="h-3.5 w-3.5" strokeWidth={2} />0%
    </span>
  );
}

export default async function OrgDashboardPage({
  searchParams,
}: {
  searchParams: { calYear?: string; calMonth?: string };
}) {
  const user = await requireOrgAdmin();
  const scope = { organizationId: user.organizationId };
  const now = nowKst();
  const calYear = Number(searchParams.calYear ?? now.getFullYear());
  const calMonth = Number(searchParams.calMonth ?? now.getMonth() + 1);

  const [org, stats, extra, daily, monthly, channel, recent, calDays, topDonors, campaigns] = await Promise.all([
    prisma.organization
      .findUnique({ where: { id: user.organizationId }, select: { name: true } })
      .catch(() => null),
    getDashboardStats(scope).catch(() => EMPTY_STATS),
    getDashboardExtra(scope).catch(() => EMPTY_EXTRA),
    getDailySeries(scope, 30).catch(() => [] as { date: string; amount: number }[]),
    getMonthlySeries(scope, 12).catch(() => [] as { month: string; amount: number }[]),
    getChannelBreakdown(scope).catch(() => [] as { channel: string; name: string; amount: number }[]),
    prisma.donation
      .findMany({
        where: { ...scope, deletedAt: null, status: "COMPLETED" },
        orderBy: { donatedAt: "desc" },
        take: 10,
        include: {
          donor: { select: { name: true } },
          campaign: { select: { title: true } },
        },
      })
      .catch(() => []),
    getMonthlyCalendar(scope, calYear, calMonth).catch(() => []),
    getTopDonors(scope, 5).catch(() => [] as { donorId: string; name: string; totalAmount: number; count: number }[]),
    getActiveCampaignProgress(scope, 5).catch(() => [] as { id: string; title: string; goalAmount: number; currentAmount: number; progress: number; endDate: string | null }[]),
  ]);

  return (
    <OrgLayout userName={user.name} orgName={org?.name ?? "기관"}>
      <PageHeader
        title="대시보드"
        description={`${org?.name ?? "기관"} · ${now.getFullYear()}년 ${now.getMonth() + 1}월`}
      />

      {/* ── 주요 지표 8개 ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="총 모금액"      value={stats.totalAmount}        icon={Wallet}        color="green" />
        <StatCard label="이번 달 모금액" value={stats.monthAmount}         icon={CalendarDays}  color="blue" />
        <StatCard label="오늘 모금액"    value={stats.todayAmount}         icon={Sun}           color="amber" />
        <StatCard label="후원자 수"      value={stats.donorCount}          icon={Users}         unit="count" color="violet" />
        <StatCard label="문자후원"       value={stats.smsAmount}           icon={MessageSquare} color="sky" />
        <StatCard label="간편 계좌이체" value={stats.easyTransferAmount}  icon={Landmark}      color="teal" />
        <StatCard label="정기후원"       value={stats.recurringAmount}     icon={RefreshCw}     color="rose" />
        <StatCard label="진행 중 캠페인" value={stats.activeCampaigns}    icon={Megaphone}     unit="count" color="orange" />
      </div>

      {/* ── 이달 신규 지표 4개 ── */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* 신규 후원자 */}
        <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-sky-100/60 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-sky-700">신규 후원자 (이달)</p>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-sky-100 text-sky-600">
              <UserPlus className="h-4 w-4" strokeWidth={1.75} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-sky-900">
            {extra.newDonorsThisMonth.toLocaleString("ko-KR")}명
          </p>
          <p className="mt-1 text-xs text-sky-600/70">
            정기후원자 {extra.recurringCount.toLocaleString("ko-KR")}명
          </p>
        </div>

        {/* 이달 후원 건수 */}
        <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-violet-100/60 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-violet-700">이달 후원 건수</p>
            <GrowthBadge value={extra.monthGrowth} />
          </div>
          <p className="mt-2 text-2xl font-bold text-violet-900">
            {extra.monthDonationCount.toLocaleString("ko-KR")}건
          </p>
          <p className="mt-1 text-xs text-violet-600/70">
            전달 {extra.lastMonthDonationCount.toLocaleString("ko-KR")}건
          </p>
        </div>

        {/* 이번 주 모금액 */}
        <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-teal-100/60 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-teal-700">이번 주 모금액</p>
            <GrowthBadge value={extra.weekGrowth} />
          </div>
          <p className="mt-2 text-2xl font-bold text-teal-900">{formatKRW(extra.weekAmount)}</p>
          <p className="mt-1 text-xs text-teal-600/70">지난주 {formatKRW(extra.lastWeekAmount)}</p>
        </div>

        {/* 빠른 이동 */}
        <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-orange-100/60 p-4 shadow-card">
          <p className="text-xs font-medium text-orange-700">빠른 이동</p>
          <div className="mt-2 space-y-1.5">
            <Link
              href="/org/donors"
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-orange-800 hover:bg-orange-100/50"
            >
              후원자 관리 <ArrowRight className="h-3 w-3" strokeWidth={2} />
            </Link>
            <Link
              href="/org/campaigns"
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-orange-800 hover:bg-orange-100/50"
            >
              캠페인 관리 <ArrowRight className="h-3 w-3" strokeWidth={2} />
            </Link>
            <Link
              href="/org/reports"
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-orange-800 hover:bg-orange-100/50"
            >
              통계 리포트 <ArrowRight className="h-3 w-3" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── 라인 차트 + 채널 도넛 ── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">최근 30일 일별 모금액</h2>
          <DailyLineChart data={daily} />
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">채널별 비중</h2>
          <ChannelDonutChart data={channel} />
        </div>
      </div>

      {/* ── 후원 캘린더 + 월별 바 차트 ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <DashboardCalendar
            year={calYear}
            month={calMonth}
            days={calDays}
            calendarHref="/org/calendar"
          />
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">최근 12개월 월별 모금액</h2>
          <MonthlyBarChart data={monthly} />
        </div>
      </div>

      {/* ── 상위 후원자 + 캠페인 진척 ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* 상위 후원자 TOP 5 */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
              <Trophy className="h-4 w-4 text-amber-500" strokeWidth={1.75} />
              상위 후원자 TOP 5
            </h2>
            <Link href="/org/donors" className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
              전체 <ArrowRight className="h-3 w-3" strokeWidth={2} />
            </Link>
          </div>
          {topDonors.length === 0 ? (
            <p className="text-xs text-stone-400">후원 내역이 없습니다.</p>
          ) : (
            <ol className="space-y-3">
              {topDonors.map((d, i) => (
                <li key={d.donorId} className="flex items-center gap-3">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    i === 0 ? "bg-amber-400 text-white" :
                    i === 1 ? "bg-stone-300 text-stone-700" :
                    i === 2 ? "bg-orange-300 text-white" :
                    "bg-stone-100 text-stone-500"
                  }`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-stone-800">{d.name}</p>
                    <p className="text-[11px] text-stone-400">{d.count}건</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-stone-900">{formatKRW(d.totalAmount)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* 캠페인 진척 */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
              <Target className="h-4 w-4 text-brand-500" strokeWidth={1.75} />
              진행 중 캠페인
            </h2>
            <Link href="/org/campaigns" className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
              전체 <ArrowRight className="h-3 w-3" strokeWidth={2} />
            </Link>
          </div>
          {campaigns.length === 0 ? (
            <p className="text-xs text-stone-400">진행 중인 캠페인이 없습니다.</p>
          ) : (
            <ul className="space-y-4">
              {campaigns.map((c) => (
                <li key={c.id}>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="max-w-[60%] truncate text-xs font-medium text-stone-800">{c.title}</p>
                    <span className="text-[11px] font-semibold text-brand-600">{c.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${c.progress}%` }}
                    />
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[11px] text-stone-400">
                    <span>{formatKRW(c.currentAmount)}</span>
                    {c.goalAmount > 0 && <span>목표 {formatKRW(c.goalAmount)}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── 최근 후원 내역 ── */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-900">최근 후원 내역</h2>
          <Link
            href="/org/donations"
            className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
          >
            전체 보기 <ArrowRight className="h-3 w-3" strokeWidth={2} />
          </Link>
        </div>
        <DonationTable rows={recent.map(toDonationRow)} />
      </div>
    </OrgLayout>
  );
}
