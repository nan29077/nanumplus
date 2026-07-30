import { requireSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { MigrationTabsClient } from "@/components/admin/migration-tabs-client";

export const dynamic = "force-dynamic";

export default async function MigrationPage() {
  const user = await requireSuperAdmin();

  const organizations = await prisma.organization.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <AdminLayout userName={user.name}>
      <PageHeader
        title="데이터 마이그레이션"
        description="기존 복지기관 DB 데이터를 엑셀 파일로 업로드하여 시스템에 가져옵니다."
      />
      <MigrationTabsClient organizations={organizations} />
    </AdminLayout>
  );
}
