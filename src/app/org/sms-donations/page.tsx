import type { Prisma } from "@prisma/client";
import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parsePageParam, parseStatusParam } from "@/lib/utils";
import { OrgLayout } from "@/components/layout/org-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/donation/filter-bar";
import { SmsDonationGrid, type SmsDonationRow } from "@/components/donation/sms-donation-card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { maskPhone } from "@/lib/masking";
import { resolveListPeriod } from "@/lib/kst-date";
import {
  LIST_PERIOD_PRESETS,
  donatedAtWhere,
  completedSummary,
  listHref,
} from "@/lib/donation-period";
import { MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

type SP = {
  status?: string;
  page?: string;
  period?: string;
  from?: string;
  to?: string;
};

export default async function Page({ searchParams }: { searchParams: SP }) {
  const user = await requireOrgAdmin();
  const page = parsePageParam(searchParams.page);
  const take = 18;

  // status 화이트리스트 검증 — 잘못된 값은 무시하고 전체 조회로 폴백
  const status = parseStatusParam(searchParams.status,
    ["PENDING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED"] as const);
  const period = resolveListPeriod(searchParams);

  const where: Prisma.DonationWhereInput = {
    organizationId: user.organizationId,
    deletedAt: null,
    channel: "SMS",
    ...(status ? { status } : {}),
    ...donatedAtWhere(period),
  };

  const [org, donations, total, summary] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true, smsFullNumber: true },
    }),
    prisma.donation.findMany({
      where,
      orderBy: [{ donatedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * take,
      take,
    }),
    prisma.donation.count({ where }),
    completedSummary(where),
  ]);

  const rows: SmsDonationRow[] = donations.map((d) => ({
    id: d.id,
    smsBody: d.smsBody ?? null,
    // 원본 발신번호가 RSC 직렬화로 브라우저에 노출되지 않도록 서버에서 마스킹
    senderPhone: d.senderPhone ? maskPhone(d.senderPhone) : null,
    donatedAt: d.donatedAt.toISOString(),
    amount: d.amount,
    status: d.status,
  }));

  return (
    <OrgLayout userName={user.name} orgName={org?.name ?? "기관"}>
      <PageHeader
        title="문자후원 내역"
        description="문자후원(#2540) 채널로 들어온 후원입니다. 건당 3,000원 고정."
      />

      {/* 기간 */}
      <div className="mb-3">
        <DateRangePicker presets={LIST_PERIOD_PRESETS} defaultPeriod="all" />
      </div>

      {/* 요약 배지 — 고른 상태·기간 기준 */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5">
          <MessageSquare className="h-4 w-4 text-sky-600" strokeWidth={1.75} />
          <div>
            <p className="text-[11px] font-medium text-sky-500">{period.label} 완료 건수</p>
            <p className="text-lg font-bold text-sky-700">
              {summary.completedCount.toLocaleString("ko-KR")}건
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5">
          <div>
            <p className="text-[11px] font-medium text-sky-500">{period.label} 모금액</p>
            <p className="text-lg font-bold text-sky-700">
              {summary.completedAmount.toLocaleString("ko-KR")}원
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5">
          <p className="text-[11px] font-medium text-stone-500">조회 건수</p>
          <p className="text-lg font-bold text-stone-800">{total.toLocaleString("ko-KR")}건</p>
        </div>
        {org?.smsFullNumber && (
          <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5">
            <p className="text-[11px] font-medium text-stone-500">기관 문자후원 번호</p>
            <p className="text-base font-bold tracking-wide text-stone-800">{org.smsFullNumber}</p>
          </div>
        )}
      </div>

      {/* 상태 */}
      <div className="mb-4 flex gap-2 text-sm">
        {[
          { label: "전체", value: "" },
          { label: "완료", value: "COMPLETED" },
          { label: "대기", value: "PENDING" },
          { label: "실패", value: "FAILED" },
        ].map((f) => (
          <a
            key={f.value}
            href={listHref(searchParams, { status: f.value || null })}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              (searchParams.status ?? "") === f.value
                ? "bg-brand-600 text-white"
                : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <SmsDonationGrid rows={rows} />
      <div className="mt-6">
        <Pagination total={total} page={page} pageSize={take} />
      </div>
    </OrgLayout>
  );
}
