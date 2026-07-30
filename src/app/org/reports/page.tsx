import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getPeriodReport, getDailySeries, getMonthlySeries, getChannelBreakdown } from "@/services/stats";
import type { PeriodKey } from "@/lib/kst-date";
import { OrgLayout } from "@/components/layout/org-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { ReportView } from "@/components/donation/report-view";

export const dynamic = "force-dynamic";

export default async function OrgReportsPage({
  searchParams,
}: { searchParams: { period?: string; from?: string; to?: string } }) {
  const user = await requireOrgAdmin();
  const scope = { organizationId: user.organizationId };
  const period = (searchParams.period ?? "thisMonth") as PeriodKey;
  const custom = searchParams.from && searchParams.to ? { from: searchParams.from, to: searchParams.to } : undefined;

  const [org, report, daily, monthly, channel] = await Promise.all([
    prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }),
    getPeriodReport(scope, period, custom),
    getDailySeries(scope, 30),
    getMonthlySeries(scope, 12),
    getChannelBreakdown(scope, period),
  ]);

  return (
    <OrgLayout userName={user.name} orgName={org?.name ?? "기관"}>
      <PageHeader title="통계 리포트" description="기간을 선택해 우리 기관의 모금 현황을 분석하세요." action={<DateRangePicker />} />
      <ReportView report={report} daily={daily} monthly={monthly} channel={channel} />
    </OrgLayout>
  );
}
