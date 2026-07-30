import Link from "next/link";
import { requireSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { fmtKst } from "@/lib/kst-date";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DonorTable, type DonorRow } from "@/components/donation/donor-table";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function AdminDonorsPage({ searchParams }: { searchParams: { page?: string } }) {
  const user = await requireSuperAdmin();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const [donors, totalCount] = await Promise.all([
    prisma.donor.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
      include: {
        organization: { select: { name: true } },
        donations: {
          where: { status: "COMPLETED", deletedAt: null },
          select: { amount: true, donatedAt: true },
          orderBy: { donatedAt: "desc" },
        },
      },
    }),
    prisma.donor.count({ where: { deletedAt: null } }),
  ]);

  const rows: DonorRow[] = donors.map((d) => ({
    id: d.id,
    name: d.name,
    phone: d.phone,
    email: d.email,
    isRecurring: d.isRecurring,
    memo: d.organization ? `소속 기관: ${d.organization.name}${d.memo ? ` · ${d.memo}` : ""}` : d.memo,
    totalAmount: d.donations.reduce((s: number, x: { amount: number }) => s + x.amount, 0),
    donationCount: d.donations.length,
    lastDonatedAt: d.donations[0] ? fmtKst(d.donations[0].donatedAt, "yyyy-MM-dd") : null,
    createdAt: fmtKst(d.createdAt, "yyyy-MM-dd"),
  }));

  const hasMore = skip + donors.length < totalCount;

  return (
    <AdminLayout userName={user.name}>
      <PageHeader
        title="후원자"
        description={`전체 ${totalCount.toLocaleString("ko-KR")}명 (개인정보는 마스킹되어 표시됩니다)`}
      />
      <DonorTable donors={rows} showCsv={false} />
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
    </AdminLayout>
  );
}
