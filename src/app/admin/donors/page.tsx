import { requireSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { fmtKst } from "@/lib/kst-date";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DonorTable, type DonorRow } from "@/components/donation/donor-table";

export const dynamic = "force-dynamic";

export default async function AdminDonorsPage() {
  const user = await requireSuperAdmin();

  const donors = await prisma.donor.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      organization: { select: { name: true } },
      donations: {
        where: { status: "COMPLETED", deletedAt: null },
        select: { amount: true, donatedAt: true },
        orderBy: { donatedAt: "desc" },
      },
    },
  });

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

  return (
    <AdminLayout userName={user.name}>
      <PageHeader title="후원자" description={`전체 기관의 후원자 ${rows.length.toLocaleString("ko-KR")}명 (개인정보는 마스킹되어 표시됩니다)`} />
      <DonorTable donors={rows} showCsv={false} />
    </AdminLayout>
  );
}
