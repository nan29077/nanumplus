import { requireSuperAdmin } from "@/lib/rbac";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { OrgMigrationClient } from "@/components/admin/org-migration-client";

export const dynamic = "force-dynamic";

export default async function OrgMigrationPage() {
  const user = await requireSuperAdmin();

  return (
    <AdminLayout userName={user.name}>
      <PageHeader
        title="기관 목록 업로드"
        description="기존 시스템의 기관 목록을 엑셀 파일로 업로드하여 일괄 등록합니다."
      />
      <OrgMigrationClient />
    </AdminLayout>
  );
}
