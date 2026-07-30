import { requireSuperAdmin } from "@/lib/rbac";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { NewOrganizationForm } from "@/components/admin/new-organization-form";

export const dynamic = "force-dynamic";

export default async function NewOrganizationPage() {
  const user = await requireSuperAdmin();
  return (
    <AdminLayout userName={user.name}>
      <PageHeader title="기관 등록" description="새 후원 기관과 기관 관리자 계정을 생성합니다." />
      <div className="max-w-3xl">
        <NewOrganizationForm />
      </div>
    </AdminLayout>
  );
}
