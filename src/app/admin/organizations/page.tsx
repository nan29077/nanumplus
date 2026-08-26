import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { OrgListClient, type OrgListItem } from "@/components/admin/org-list-client";

export const dynamic = "force-dynamic";

export default async function AdminOrganizationsPage() {
  const user = await requireSuperAdmin();

  // 후원 합계는 전체 행을 로드하지 않고 groupBy 집계 쿼리로 분리한다.
  // qrCodeUrl은 data URL이라 용량이 크므로 목록에서는 조회하지 않는다.
  const [orgs, donationSums] = await Promise.all([
    prisma.organization.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        smsFullNumber: true,
        phone: true,
        isActive: true,
        // 검색용 로그인 ID(기관 관리자 이메일)
        admins: { select: { user: { select: { email: true } } }, take: 1 },
        _count: { select: { donors: { where: { deletedAt: null } }, campaigns: { where: { deletedAt: null } } } },
      },
    }),
    prisma.donation.groupBy({
      by: ["organizationId"],
      where: { status: "COMPLETED", deletedAt: null },
      _sum: { amount: true },
    }),
  ]);

  const totalByOrg = new Map<string, number>(
    donationSums
      .filter((g): g is typeof g & { organizationId: string } => g.organizationId !== null)
      .map((g) => [g.organizationId, g._sum.amount ?? 0])
  );

  const items: OrgListItem[] = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    logoUrl: o.logoUrl,
    smsFullNumber: o.smsFullNumber,
    phone: o.phone,
    loginId: o.admins[0]?.user.email ?? null,
    isActive: o.isActive,
    donorCount: o._count.donors,
    campaignCount: o._count.campaigns,
    total: totalByOrg.get(o.id) ?? 0,
  }));

  return (
    <AdminLayout userName={user.name}>
      <PageHeader
        title="기관 관리"
        description="후원 기관을 등록하고 문자후원 번호와 QR 코드를 관리합니다."
        action={
          <Link href="/admin/organizations/new"
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" strokeWidth={1.75} /> 기관 등록
          </Link>
        }
      />

      <OrgListClient orgs={items} />
    </AdminLayout>
  );
}
