import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { OrgLayout } from "@/components/layout/org-layout";
import { PageHeader } from "@/components/layout/page-header";
import { CampaignForm } from "@/components/donation/campaign-form";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  const user = await requireOrgAdmin();
  const org = await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } });

  return (
    <OrgLayout userName={user.name} orgName={org?.name ?? "기관"}>
      <PageHeader title="캠페인 만들기" description="모금 목표와 스토리를 담아 캠페인을 등록하세요." />
      <div className="max-w-3xl">
        <CampaignForm />
      </div>
    </OrgLayout>
  );
}
