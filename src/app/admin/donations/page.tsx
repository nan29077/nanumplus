import { requireSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DonationTable } from "@/components/donation/donation-table";
import { FilterBar, Pagination } from "@/components/donation/filter-bar";
import { fetchAllDonations } from "@/lib/donation-raw-query";

export const dynamic = "force-dynamic";

export default async function AdminDonationsPage({
  searchParams,
}: { searchParams: { orgId?: string; channel?: string; status?: string; page?: string } }) {
  const user = await requireSuperAdmin();
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 20;

  const [{ rows, total }, orgs] = await Promise.all([
    fetchAllDonations(
      searchParams.orgId ?? null,
      searchParams.channel ?? null,
      searchParams.status ?? null,
      take,
      (page - 1) * take
    ),
    prisma.organization.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AdminLayout userName={user.name}>
      <PageHeader title="전체 후원 내역" description={`총 ${total.toLocaleString("ko-KR")}건의 후원 기록`} />
      <FilterBar orgs={orgs.map((o) => ({ value: o.id, label: o.name }))} />
      <DonationTable rows={rows} showOrg />
      <Pagination total={total} page={page} pageSize={take} />
    </AdminLayout>
  );
}
