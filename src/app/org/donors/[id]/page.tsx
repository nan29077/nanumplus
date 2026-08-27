import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Phone, Mail, CalendarDays, Link2 as LinkIcon, ShieldCheck,
  HandCoins, Repeat, Hash, Sigma, ReceiptText, TrendingUp, Wallet,
} from "lucide-react";
import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatKRW, formatNumber, parsePageParam } from "@/lib/utils";
import { Badge, ChannelBadge, StatusBadge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { OrgLayout } from "@/components/layout/org-layout";
import { MonthlyBarChart, ChannelDonutChart } from "@/components/charts/client-charts";
import { DonorMemoForm } from "@/components/org/donor-memo-form";
import { getDonorDetail } from "@/services/donor-detail";

export const dynamic = "force-dynamic";

const PROVIDER_LABELS: Record<string, string> = {
  kakao: "카카오",
  naver: "네이버",
  google: "구글",
  credentials: "이메일",
};

export default async function OrgDonorDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { dpage?: string };
}) {
  const user = await requireOrgAdmin();
  const historyPage = parsePageParam(searchParams.dpage);

  const [org, detail] = await Promise.all([
    prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }),
    getDonorDetail(user.organizationId, params.id, { historyPage }),
  ]);

  // 타 기관 후원자 ID로 접근하면 상세를 조회할 수 없다 (getDonorDetail이 기관 스코프로 조회)
  if (!detail) notFound();

  const { donor, status, summary, monthly, channels, yearly, recurrings, history } = detail;
  const hasChannelData = channels.some((c) => c.amount > 0);

  const summaryCards = [
    { icon: HandCoins, label: "누적 후원 금액", value: formatKRW(summary.totalAmount) },
    { icon: Sigma, label: "평균 후원 금액", value: formatKRW(summary.avgAmount) },
    { icon: Hash, label: "후원 횟수", value: `${formatNumber(summary.donationCount)}건` },
    { icon: TrendingUp, label: "최고 후원 금액", value: formatKRW(summary.maxAmount) },
  ];

  return (
    <OrgLayout userName={user.name} orgName={org?.name ?? "기관"}>
      <Link
        href="/org/donors"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> 후원자 목록
      </Link>

      {/* 기본 정보 */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-stone-900">{donor.name}</h1>
              <Badge tone={status.tone}>{status.label}</Badge>
              {donor.isLinked && <Badge tone="violet">간편로그인 연동</Badge>}
              {donor.privacyConsent && <Badge tone="green">개인정보 동의</Badge>}
            </div>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-600">
              <div className="flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-stone-400" strokeWidth={1.75} />
                <dt className="sr-only">연락처</dt>
                <dd>{donor.phone}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-stone-400" strokeWidth={1.75} />
                <dt className="sr-only">이메일</dt>
                <dd>{donor.email}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-stone-400" strokeWidth={1.75} />
                <dt className="sr-only">등록일</dt>
                <dd>등록 {donor.createdAt}</dd>
              </div>
              {donor.isLinked && (
                <div className="flex items-center gap-1.5 text-violet-600">
                  <LinkIcon className="h-4 w-4" strokeWidth={1.75} />
                  <dt className="sr-only">연동 계정</dt>
                  <dd>
                    {PROVIDER_LABELS[donor.accountProvider ?? ""] ?? donor.accountProvider ?? "계정"} 연동
                    {donor.accountLastLoginAt ? ` · 최근 로그인 ${donor.accountLastLoginAt}` : ""}
                  </dd>
                </div>
              )}
            </dl>
          </div>
          <div className="rounded-xl bg-stone-50 px-4 py-3 text-right">
            <p className="text-[11px] text-stone-400">첫 후원 · 최근 후원</p>
            <p className="mt-0.5 text-sm font-semibold text-stone-800">
              {summary.firstDonatedAt ?? "-"} ~ {summary.lastDonatedAt ?? "-"}
            </p>
          </div>
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-stone-400">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
          개인정보 보호를 위해 연락처와 이메일은 마스킹되어 표시됩니다.
        </p>
      </section>

      {/* 요약 카드 */}
      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-card">
            <c.icon className="h-4 w-4 text-brand-600" strokeWidth={1.75} />
            <p className="mt-2 text-lg font-bold text-stone-900">{c.value}</p>
            <p className="text-[11px] text-stone-400">{c.label}</p>
          </div>
        ))}
      </section>
      {summary.truncated && (
        <p className="mt-2 text-xs text-amber-600">
          후원 건수가 매우 많아 최근 20,000건만 통계에 반영했습니다.
        </p>
      )}

      {/* 차트 */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card lg:col-span-2">
          <h2 className="text-sm font-semibold text-stone-800">월별 후원 금액 (최근 12개월)</h2>
          {summary.donationCount === 0 ? (
            <p className="py-20 text-center text-sm text-stone-400">완료된 후원 내역이 없습니다.</p>
          ) : (
            <div className="mt-3">
              <MonthlyBarChart data={monthly.map((m) => ({ month: m.label, amount: m.amount }))} />
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold text-stone-800">채널별 후원 비중</h2>
          {hasChannelData ? (
            <div className="mt-3">
              <ChannelDonutChart
                data={channels.map((c) => ({ channel: c.channel, name: c.name, amount: c.amount }))}
              />
            </div>
          ) : (
            <p className="py-20 text-center text-sm text-stone-400">표시할 후원 데이터가 없습니다.</p>
          )}
          <ul className="mt-3 space-y-1 border-t border-stone-100 pt-3">
            {channels.map((c) => (
              <li key={c.channel} className="flex items-center justify-between text-xs">
                <span className="text-stone-500">{c.name}</span>
                <span className="text-stone-700">
                  {formatNumber(c.count)}건 · {formatKRW(c.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 정기후원 현황 */}
      <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-800">
            <Repeat className="h-4 w-4 text-brand-600" strokeWidth={1.75} /> 정기후원 현황
          </h2>
          {summary.activeRecurringCount > 0 && (
            <p className="text-xs text-stone-500">
              활성 {summary.activeRecurringCount}건 · 월 {formatKRW(summary.activeRecurringAmount)}
            </p>
          )}
        </div>
        {recurrings.length === 0 ? (
          <p className="mt-4 rounded-xl bg-stone-50 py-8 text-center text-sm text-stone-400">
            등록된 정기후원이 없습니다.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recurrings.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-100 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={r.status} />
                  <span className="text-sm font-semibold text-stone-800">{formatKRW(r.amount)}</span>
                  <span className="text-xs text-stone-500">매월 {r.dayOfMonth}일</span>
                  <span className="text-xs text-stone-400">{r.methodLabel}</span>
                  {r.card && <span className="text-xs text-stone-400">{r.card}</span>}
                </div>
                <p className="text-xs text-stone-400">
                  시작 {r.startedAt}
                  {r.cancelledAt ? ` · 해지 ${r.cancelledAt}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 담당자 메모 */}
      <section className="mt-4">
        <DonorMemoForm donorId={donor.id} initialMemo={donor.memo} />
      </section>

      {/* 기부금영수증 대상 금액 */}
      <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-800">
          <ReceiptText className="h-4 w-4 text-brand-600" strokeWidth={1.75} /> 연도별 기부금영수증 대상 금액
        </h2>
        <p className="mt-1 text-[11px] text-stone-400">
          완료 상태의 후원 금액을 연도별로 합산한 값입니다. 실제 영수증 발급은 기관에서 별도 처리합니다.
        </p>
        {yearly.length === 0 ? (
          <p className="mt-4 rounded-xl bg-stone-50 py-8 text-center text-sm text-stone-400">
            발급 대상 후원 내역이 없습니다.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {yearly.map((y) => (
              <li key={y.year} className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3">
                <span className="flex items-center gap-1.5 text-sm text-stone-600">
                  <Wallet className="h-4 w-4 text-stone-400" strokeWidth={1.75} /> {y.year}년
                </span>
                <span className="text-right">
                  <span className="block text-sm font-semibold text-stone-800">{formatKRW(y.amount)}</span>
                  <span className="block text-[11px] text-stone-400">{formatNumber(y.count)}건</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 후원 내역 */}
      <section className="mt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-stone-800">후원 내역</h2>
          <p className="text-xs text-stone-400">
            총 {formatNumber(history.total)}건 · {history.page}/{history.totalPages} 페이지
          </p>
        </div>

        {history.rows.length === 0 ? (
          <EmptyState title="후원 내역이 없습니다" description="이 후원자로 기록된 후원 건이 아직 없습니다." />
        ) : (
          <>
            {/* 모바일 카드 */}
            <ul className="space-y-2 sm:hidden">
              {history.rows.map((d) => (
                <li key={d.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <ChannelBadge channel={d.channel} />
                    <StatusBadge status={d.status} />
                  </div>
                  <p className="mt-2 text-base font-semibold text-stone-900">{formatKRW(d.amount)}</p>
                  <p className="text-xs text-stone-400">{d.donatedAt}</p>
                  {d.campaignTitle && <p className="mt-1 text-xs text-stone-500">{d.campaignTitle}</p>}
                </li>
              ))}
            </ul>

            {/* 데스크톱 표 */}
            <div className="hidden sm:block">
              <DataTable headers={["후원일시", "금액", "유형", "캠페인", "상태"]}>
                {history.rows.map((d) => (
                  <tr key={d.id} className="hover:bg-stone-50/60">
                    <td className="whitespace-nowrap px-4 py-3 text-stone-500">{d.donatedAt}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-stone-800">
                      {formatKRW(d.amount)}
                    </td>
                    <td className="px-4 py-3"><ChannelBadge channel={d.channel} /></td>
                    <td className="px-4 py-3 text-stone-500">{d.campaignTitle ?? "-"}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  </tr>
                ))}
              </DataTable>
            </div>

            {history.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                {history.page > 1 && (
                  <Link
                    href={`/org/donors/${donor.id}?dpage=${history.page - 1}`}
                    className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
                  >
                    이전
                  </Link>
                )}
                <span className="text-sm text-stone-400">
                  {history.page} / {history.totalPages}
                </span>
                {history.page < history.totalPages && (
                  <Link
                    href={`/org/donors/${donor.id}?dpage=${history.page + 1}`}
                    className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
                  >
                    다음
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </OrgLayout>
  );
}
