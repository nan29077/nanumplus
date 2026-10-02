import { requireSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parsePageParam, parseStatusParam } from "@/lib/utils";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DonationTable } from "@/components/donation/donation-table";
import { FilterBar, Pagination } from "@/components/donation/filter-bar";
import { fetchAllDonations } from "@/lib/donation-raw-query";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PeriodSummary } from "@/components/donation/period-summary";
import { resolveListPeriod } from "@/lib/kst-date";
import { LIST_PERIOD_PRESETS } from "@/lib/donation-period";

export const dynamic = "force-dynamic";

export default async function AdminDonationsPage({
  searchParams,
}: { searchParams: { orgId?: string; channel?: string; status?: string; page?: string; period?: string; from?: string; to?: string } }) {
  const user = await requireSuperAdmin();
  const page = parsePageParam(searchParams.page);
  const take = 20;

  // 화이트리스트 검증 — 잘못된 값이 raw SQL의 enum 캐스팅 오류(서버 500)를 내지 않도록
  const channel = parseStatusParam(searchParams.channel,
    ["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER", "RECURRING_CARD"] as const);
  const status = parseStatusParam(searchParams.status,
    ["PENDING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED"] as const);

  const period = resolveListPeriod(searchParams);

  const [{ rows, total, completedCount, completedAmount }, orgs] = await Promise.all([
    fetchAllDonations(
      searchParams.orgId ?? null,
      channel ?? null,
      status ?? null,
      take,
      (page - 1) * take,
      period
    ),
    prisma.organization.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AdminLayout userName={user.name}>
      <PageHeader title="전체 후원 내역" description="모든 기관·채널의 후원 기록입니다." />
      <div className="mb-3">
        <DateRangePicker presets={LIST_PERIOD_PRESETS} defaultPeriod="all" />
      </div>
      <FilterBar orgs={orgs.map((o) => ({ value: o.id, label: o.name }))} />
      <PeriodSummary
        label={period.label}
        total={total}
        completedCount={completedCount}
        completedAmount={completedAmount}
      />
      <DonationTable rows={rows} showOrg />
      <Pagination total={total} page={page} pageSize={take} />
    </AdminLayout>
  );
}
