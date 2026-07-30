import Link from "next/link";
import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { fmtKst } from "@/lib/kst-date";
import { OrgLayout } from "@/components/layout/org-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DonorTable, type DonorRow } from "@/components/donation/donor-table";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function OrgDonorsPage({ searchParams }: { searchParams: { page?: string } }) {
  const user = await requireOrgAdmin();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const [org, donors, totalCount] = await Promise.all([
    prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }),
    prisma.donor.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
      include: {
        donations: {
          where: { status: "COMPLETED", deletedAt: null },
          select: { amount: true, donatedAt: true },
          orderBy: { donatedAt: "desc" },
        },
      },
    }),
    prisma.donor.count({ where: { organizationId: user.organizationId, deletedAt: null } }),
  ]);

  const rows: DonorRow[] = donors.map((d) => ({
    id: d.id,
    name: d.name,
    phone: d.phone,
    email: d.email,
    isRecurring: d.isRecurring,
    memo: d.memo,
    totalAmount: d.donations.reduce((s: number, x: { amount: number }) => s + x.amount, 0),
    donationCount: d.donations.length,
    lastDonatedAt: d.donations[0] ? fmtKst(d.donations[0].donatedAt, "yyyy-MM-dd") : null,
    createdAt: fmtKst(d.createdAt, "yyyy-MM-dd"),
  }));

  const hasMore = skip + donors.length < totalCount;

  return (
    <OrgLayout userName={user.name} orgName={org?.name ?? "기관"}>
      <PageHeader
        title="후원자 관리"
        description={`전체 ${totalCount.toLocaleString("ko-KR")}명 · 연락처는 개인정보 보호를 위해 마스킹됩니다.`}
      />
      <DonorTable donors={rows} showCsv />
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Link
            href={`?page=${page + 1}`}
            className="rounded-xl border border-stone-200 bg-white px-6 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            더 보기 ({totalCount - skip - donors.length}명 남음)
          </Link>
        </div>
      )}
    </OrgLayout>
  );
}
