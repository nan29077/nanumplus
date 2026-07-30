import { requireSuperAdmin, orgScope } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getPeriodReport, getDailySeries, getMonthlySeries, getChannelBreakdown } from "@/services/stats";
import type { PeriodKey } from "@/lib/kst-date";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { FilterBar } from "@/components/donation/filter-bar";
import { ReportView } from "@/components/donation/report-view";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: { searchParams: { orgId?: string; period?: string; from?: string; to?: string } }) {
  const user = await requireSuperAdmin();
  const period = (searchParams.period ?? "thisMonth") as PeriodKey;
  const custom = searchParams.from && searchParams.to ? { from: searchParams.from, to: searchParams.to } : undefined;
  const scope = orgScope(user, searchParams.orgId);

  const [report, daily, monthly, channel, orgs] = await Promise.all([
    getPeriodReport(scope, period, custom),
    getDailySeries(scope, 30),
    getMonthlySeries(scope, 12),
    getChannelBreakdown(scope, period),
    prisma.organization.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <AdminLayout userName={user.name}>
      <PageHeader title="통계 리포트" description="기간과 기관을 선택해 모금 현황을 분석하세요." action={<DateRangePicker />} />
      <FilterBar orgs={orgs.map((o) => ({ value: o.id, label: o.name }))} showChannel={false} showStatus={false} />
      <ReportView report={report} daily={daily} monthly={monthly} channel={channel} />
    </AdminLayout>
  );
}
