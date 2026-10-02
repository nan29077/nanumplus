import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parsePageParam, parseStatusParam } from "@/lib/utils";
import { OrgLayout } from "@/components/layout/org-layout";
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
}: { searchParams: { status?: string; page?: string; period?: string; from?: string; to?: string } }) {
  const user = await requireOrgAdmin();
  const page = parsePageParam(searchParams.page);
  const take = 20;

  // status 화이트리스트 검증 — 잘못된 값은 무시하고 전체 조회로 폴백
  const status = parseStatusParam(searchParams.status,
    ["PENDING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED"] as const);
  const period = resolveListPeriod(searchParams);
  const where = {
    organizationId: user.organizationId,
    deletedAt: null,
    channel: "EASY_TRANSFER" as const,
    ...(status ? { status } : {}),
    ...donatedAtWhere(period),
  };

  const [org, rows, total, summary] = await Promise.all([
    prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }),
    prisma.donation.findMany({
      where, orderBy: { donatedAt: "desc" }, skip: (page - 1) * take, take,
      include: { donor: { select: { name: true } }, campaign: { select: { title: true } } },
    }),
    prisma.donation.count({ where }),
    completedSummary(where),
  ]);

  return (
    <OrgLayout userName={user.name} orgName={org?.name ?? "기관"}>
      <PageHeader title="간편 계좌이체" description="온기 간편 계좌이체 후원 기록입니다." />
      <div className="mb-3">
        <DateRangePicker presets={LIST_PERIOD_PRESETS} defaultPeriod="all" />
      </div>
      <FilterBar showChannel={false} />
      <PeriodSummary label={period.label} total={total} {...summary} />
      <DonationTable rows={rows.map(toDonationRow)} />
      <Pagination total={total} page={page} pageSize={take} />
    </OrgLayout>
  );
}
