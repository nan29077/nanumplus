import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parsePageParam, parseStatusParam } from "@/lib/utils";
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
  const page = parsePageParam(searchParams.page);
  const take = 20;

  // 화이트리스트 검증 — 잘못된 쿼리 값이 Prisma enum 오류(서버 500)를 내지 않도록
  const channel = parseStatusParam(searchParams.channel,
    ["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER", "RECURRING_CARD"] as const);
  const status = parseStatusParam(searchParams.status,
    ["PENDING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED"] as const);

  const where: Prisma.DonationWhereInput = {
    organizationId: user.organizationId,
    deletedAt: null,
    ...(channel ? { channel } : {}),
    ...(status ? { status } : {}),
  };

  const [org, rows, total] = await Promise.all([
    prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }),
    prisma.donation.findMany({
      where, orderBy: [{ donatedAt: "desc" }, { id: "desc" }], skip: (page - 1) * take, take,
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
