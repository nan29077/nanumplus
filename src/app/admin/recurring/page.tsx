import { requireSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parsePageParam, parseStatusParam } from "@/lib/utils";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DonationTable } from "@/components/donation/donation-table";
import { FilterBar, Pagination } from "@/components/donation/filter-bar";
import { toDonationRow } from "@/lib/format-donation";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PeriodSummary } from "@/components/donation/period-summary";
import { resolveListPeriod } from "@/lib/kst-date";
import { LIST_PERIOD_PRESETS, donatedAtWhere, completedSummary } from "@/lib/donation-period";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: { searchParams: { orgId?: string; status?: string; page?: string; period?: string; from?: string; to?: string } }) {
  const user = await requireSuperAdmin();
  const page = parsePageParam(searchParams.page);
  const take = 20;

  // status 화이트리스트 검증 — 잘못된 값은 무시하고 전체 조회로 폴백
  const status = parseStatusParam(searchParams.status,
    ["PENDING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED"] as const);
  const period = resolveListPeriod(searchParams);
  const where = {
    deletedAt: null,
    channel: "RECURRING_TRANSFER" as const,
    ...(searchParams.orgId ? { organizationId: searchParams.orgId } : {}),
    ...(status ? { status } : {}),
    ...donatedAtWhere(period),
  };

  const [rows, total, orgs, summary] = await Promise.all([
    prisma.donation.findMany({
      where, orderBy: { donatedAt: "desc" }, skip: (page - 1) * take, take,
      include: { donor: { select: { name: true } }, organization: { select: { name: true } }, campaign: { select: { title: true } } },
    }),
    prisma.donation.count({ where }),
    prisma.organization.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    completedSummary(where),
  ]);

  return (
    <AdminLayout userName={user.name}>
      <PageHeader title="정기후원 내역" description="매월 정기적으로 출금되는 정기후원 기록입니다." />
      <div className="mb-3">
        <DateRangePicker presets={LIST_PERIOD_PRESETS} defaultPeriod="all" />
      </div>
      <FilterBar orgs={orgs.map((o) => ({ value: o.id, label: o.name }))} showChannel={false} />
      <PeriodSummary label={period.label} total={total} {...summary} />
      <DonationTable rows={rows.map(toDonationRow)} showOrg />
      <Pagination total={total} page={page} pageSize={take} />
    </AdminLayout>
  );
}
