import { requireSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parsePageParam } from "@/lib/utils";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DonationTable } from "@/components/donation/donation-table";
import { FilterBar, Pagination } from "@/components/donation/filter-bar";
import { toDonationRow } from "@/lib/format-donation";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: { searchParams: { orgId?: string; status?: string; page?: string } }) {
  const user = await requireSuperAdmin();
  const page = parsePageParam(searchParams.page);
  const take = 20;

  const where = {
    deletedAt: null,
    channel: "EASY_TRANSFER" as const,
    ...(searchParams.orgId ? { organizationId: searchParams.orgId } : {}),
    ...(searchParams.status ? { status: searchParams.status as never } : {}),
  };

  const [rows, total, orgs] = await Promise.all([
    prisma.donation.findMany({
      where, orderBy: { donatedAt: "desc" }, skip: (page - 1) * take, take,
      include: { donor: { select: { name: true } }, organization: { select: { name: true } }, campaign: { select: { title: true } } },
    }),
    prisma.donation.count({ where }),
    prisma.organization.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <AdminLayout userName={user.name}>
      <PageHeader title="간편 계좌이체 내역" description="온기 간편 계좌이체 후원 기록입니다." />
      <FilterBar orgs={orgs.map((o) => ({ value: o.id, label: o.name }))} showChannel={false} />
      <DonationTable rows={rows.map(toDonationRow)} showOrg />
      <Pagination total={total} page={page} pageSize={take} />
    </AdminLayout>
  );
}
