import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { fmtKst } from "@/lib/kst-date";
import { OrgLayout } from "@/components/layout/org-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DonorTable, type DonorRow } from "@/components/donation/donor-table";

export const dynamic = "force-dynamic";

export default async function OrgDonorsPage() {
  const user = await requireOrgAdmin();

  const [org, donors] = await Promise.all([
    prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }),
    prisma.donor.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        donations: {
          where: { status: "COMPLETED", deletedAt: null },
          select: { amount: true, donatedAt: true },
          orderBy: { donatedAt: "desc" },
        },
      },
    }),
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

  return (
    <OrgLayout userName={user.name} orgName={org?.name ?? "기관"}>
      <PageHeader title="후원자 관리" description={`후원자 ${rows.length.toLocaleString("ko-KR")}명 · 연락처는 개인정보 보호를 위해 마스킹됩니다.`} />
      <DonorTable donors={rows} showCsv />
    </OrgLayout>
  );
}
