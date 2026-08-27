import { Users, RefreshCw, UserPlus, HandCoins } from "lucide-react";
import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatKRW, formatNumber } from "@/lib/utils";
import { fmtKst } from "@/lib/kst-date";
import { maskPhone, maskEmail } from "@/lib/masking";
import { resolveDonorStatus } from "@/lib/donor-status";
import {
  parseDonorQuery, donorQueryToSearchParams, resolveDonorPeriod, fetchOrgDonors,
} from "@/lib/donor-query";
import { OrgLayout } from "@/components/layout/org-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/donation/filter-bar";
import { DonorFilters } from "@/components/org/donor-filters";
import { DonorListTable, type DonorListRow } from "@/components/org/donor-list-table";

export const dynamic = "force-dynamic";

export default async function OrgDonorsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await requireOrgAdmin();
  const orgId = user.organizationId;
  const query = parseDonorQuery(searchParams);

  const [org, result] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
    fetchOrgDonors(orgId, query),
  ]);

  const now = new Date();
  const rows: DonorListRow[] = result.rows.map((d) => ({
    id: d.id,
    // 원본 연락처가 RSC 직렬화로 브라우저에 노출되지 않도록 서버에서 마스킹
    phone: maskPhone(d.phone),
    email: maskEmail(d.email),
    name: d.name,
    isLinked: d.isLinked,
    hasMemo: !!d.memo?.trim(),
    firstDonatedAt: d.firstDonatedAt ? fmtKst(d.firstDonatedAt, "yyyy-MM-dd") : null,
    lastDonatedAt: d.lastDonatedAt ? fmtKst(d.lastDonatedAt, "yyyy-MM-dd") : null,
    donationCount: d.donationCount,
    totalAmount: d.totalAmount,
    status: resolveDonorStatus(
      {
        activeRecurring: d.activeRecurring,
        recurringTotal: d.recurringTotal,
        lastDonatedAt: d.lastDonatedAt,
      },
      now
    ),
    recurringAmount: d.activeRecurring > 0 ? d.activeRecurringAmount : null,
    createdAt: fmtKst(d.createdAt, "yyyy-MM-dd"),
  }));

  // 현재 조회 조건을 그대로 CSV 다운로드에 전달
  const exportParams = donorQueryToSearchParams(query, { page: 1 });
  const exportHref = `/api/org/donors/export${exportParams.toString() ? `?${exportParams}` : ""}`;

  const range = resolveDonorPeriod(query);
  const isFiltered =
    !!query.q || query.type !== "all" || query.status !== "all" || !!range;

  const stats = [
    { icon: Users, label: isFiltered ? "조회된 후원자" : "전체 후원자", value: `${formatNumber(result.summary.donorCount)}명` },
    { icon: RefreshCw, label: "정기 후원 중", value: `${formatNumber(result.summary.recurringCount)}명` },
    { icon: UserPlus, label: "이번 달 신규", value: `${formatNumber(result.summary.newThisMonth)}명` },
    { icon: HandCoins, label: "누적 후원금", value: formatKRW(result.summary.totalAmount) },
  ];

  const rangeText = range
    ? ` · 기간 ${fmtKst(range.from, "yyyy-MM-dd")} ~ ${fmtKst(range.to, "yyyy-MM-dd")}에 후원한 후원자`
    : "";

  return (
    <OrgLayout userName={user.name} orgName={org?.name ?? "기관"}>
      <PageHeader
        title="후원자 관리"
        description={`검색·필터·정렬로 후원자를 찾고, 이름을 눌러 상세 내역을 확인하세요. 연락처는 마스킹되어 표시됩니다.`}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-card">
            <s.icon className="h-4 w-4 text-brand-600" strokeWidth={1.75} />
            <p className="mt-2 text-lg font-bold text-stone-900">{s.value}</p>
            <p className="text-[11px] text-stone-400">{s.label}</p>
          </div>
        ))}
      </div>

      <DonorFilters exportHref={exportHref} />

      <p className="mb-2 text-xs text-stone-400">
        총 {formatNumber(result.total)}명 · {result.page}/{result.totalPages} 페이지{rangeText}
      </p>

      <DonorListTable rows={rows} />

      <Pagination total={result.total} page={result.page} pageSize={result.pageSize} />
    </OrgLayout>
  );
}
