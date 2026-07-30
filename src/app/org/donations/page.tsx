import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { OrgLayout } from "@/components/layout/org-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DonationTable } from "@/components/donation/donation-table";
import { FilterBar, Pagination } from "@/components/donation/filter-bar";
import { toDonationRow } from "@/lib/format-donation";

export const dynamic = "force-dynamic";

export default async function OrgDonationsPage({
  searchParams,
}: { searchParams: { channel?: string; status?: string; page?: string } }) {
  const user = await requireOrgAdmin();
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 20;

  const where: Prisma.DonationWhereInput = {
    organizationId: user.organizationId,
    deletedAt: null,
    ...(searchParams.channel ? { channel: searchParams.channel as Prisma.DonationWhereInput["channel"] } : {}),
    ...(searchParams.status ? { status: searchParams.status as Prisma.DonationWhereInput["status"] } : {}),
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
      <PageHeader title="후원 내역" description={`총 ${total.toLocaleString("ko-KR")}건의 후원 기록`} />
      <FilterBar />
      <DonationTable rows={rows.map(toDonationRow)} />
      <Pagination total={total} page={page} pageSize={take} />
    </OrgLayout>
  );
}
