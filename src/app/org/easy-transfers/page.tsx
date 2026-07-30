import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parsePageParam } from "@/lib/utils";
import { OrgLayout } from "@/components/layout/org-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DonationTable } from "@/components/donation/donation-table";
import { FilterBar, Pagination } from "@/components/donation/filter-bar";
import { toDonationRow } from "@/lib/format-donation";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: { searchParams: { status?: string; page?: string } }) {
  const user = await requireOrgAdmin();
  const page = parsePageParam(searchParams.page);
  const take = 20;

  const where = {
    organizationId: user.organizationId,
    deletedAt: null,
    channel: "EASY_TRANSFER" as const,
    ...(searchParams.status ? { status: searchParams.status as never } : {}),
  };

  const [org, rows, total] = await Promise.all([
    prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }),
    prisma.donation.findMany({
      where, orderBy: { donatedAt: "desc" }, skip: (page - 1) * take, take,
      include: { donor: { select: { name: true } }, campaign: { select: { title: true } } },
    }),
    prisma.donation.count({ where }),
  ]);

  return (
    <OrgLayout userName={user.name} orgName={org?.name ?? "기관"}>
      <PageHeader title="간편 계좌이체" description="온기 간편 계좌이체 후원 기록입니다." />
      <FilterBar showChannel={false} />
      <DonationTable rows={rows.map(toDonationRow)} />
      <Pagination total={total} page={page} pageSize={take} />
    </OrgLayout>
  );
}
