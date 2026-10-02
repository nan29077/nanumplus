import type { Prisma } from "@prisma/client";
import { requireSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parsePageParam, parseStatusParam } from "@/lib/utils";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/donation/filter-bar";
import { SmsDonationGrid, type SmsDonationRow } from "@/components/donation/sms-donation-card";
import { SmsOrgSelect } from "@/components/admin/sms-org-select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { resolveListPeriod } from "@/lib/kst-date";
import {
  LIST_PERIOD_PRESETS,
  donatedAtWhere,
  completedSummary,
  listHref,
} from "@/lib/donation-period";
import { MessageSquare, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["COMPLETED", "FAILED", "PENDING"] as const;

type SP = {
  orgId?: string;
  status?: string;
  page?: string;
  period?: string;
  from?: string;
  to?: string;
};

export default async function Page({ searchParams }: { searchParams: SP }) {
  const user = await requireSuperAdmin();
  const page = parsePageParam(searchParams.page);
  const take = 18;

  const isUnassigned = searchParams.orgId === "__unassigned__";
  const validStatus = parseStatusParam(searchParams.status, VALID_STATUSES) ?? null;
  const period = resolveListPeriod(searchParams);

  // 예전에는 "기관배정 없음"(organizationId = null)을 Prisma 가 다루지 못해
  // SQL 문자열을 이어 붙이는 우회 코드를 3갈래로 두었다. 스키마에 nullable 이
  // 반영된 지금은 하나의 조회로 처리한다. (기간 조건을 문자열로 덧붙이지 않기 위함)
  const where: Prisma.DonationWhereInput = {
    deletedAt: null,
    channel: "SMS",
    ...(isUnassigned
      ? { organizationId: null }
      : searchParams.orgId
        ? { organizationId: searchParams.orgId }
        : {}),
    ...(validStatus ? { status: validStatus } : {}),
    ...donatedAtWhere(period),
  };

  const [orgs, donations, total, summary] = await Promise.all([
    prisma.organization.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.donation.findMany({
      where,
      orderBy: [{ donatedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * take,
      take,
      include: { organization: { select: { name: true } } },
    }),
    prisma.donation.count({ where }),
    completedSummary(where),
  ]);

  const rows: SmsDonationRow[] = donations.map((d) => ({
    id: d.id,
    smsBody: d.smsBody ?? null,
    senderPhone: d.senderPhone ?? null,
    donatedAt: d.donatedAt.toISOString(),
    amount: d.amount,
    status: d.status,
    orgName: d.organization?.name ?? null,
    recipientNumber: d.recipientNumber ?? null,
  }));

  return (
    <AdminLayout userName={user.name}>
      <PageHeader
        title="문자후원 내역"
        description="전체 기관 문자후원(#2540) 기록입니다. 건당 3,000원 고정."
      />

      {/* 기간 */}
      <div className="mb-3">
        <DateRangePicker presets={LIST_PERIOD_PRESETS} defaultPeriod="all" />
      </div>

      {/* 요약 배지 — 고른 기관·상태·기간 기준 */}
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
        <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5">
          <Building2 className="h-4 w-4 text-stone-500" strokeWidth={1.75} />
          <div>
            <p className="text-[11px] font-medium text-stone-500">조회 건수</p>
            <p className="text-lg font-bold text-stone-800">{total.toLocaleString("ko-KR")}건</p>
          </div>
        </div>
      </div>

      {/* 기관 · 상태 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SmsOrgSelect orgs={orgs} currentOrgId={searchParams.orgId} />

        <div className="flex gap-2 text-sm">
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
      </div>

      <SmsDonationGrid rows={rows} />
      <div className="mt-6">
        <Pagination total={total} page={page} pageSize={take} />
      </div>
    </AdminLayout>
  );
}
