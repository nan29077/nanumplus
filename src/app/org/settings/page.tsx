import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { OrgLayout } from "@/components/layout/org-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { OrgSettingsForm } from "@/components/org/org-settings-form";

export const dynamic = "force-dynamic";

export default async function OrgSettingsPage() {
  const user = await requireOrgAdmin();
  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: {
      name: true, slug: true, smsFullNumber: true, description: true,
      address: true, phone: true, email: true, logoUrl: true,
      bankName: true, bankAccount: true, bankHolder: true,
    },
  });

  return (
    <OrgLayout userName={user.name} orgName={org?.name ?? "기관"}>
      <PageHeader title="기관 설정" description="기관 정보를 관리합니다. 기관명·주소(slug)·문자번호 변경은 최고 관리자에게 문의하세요." />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
        <div>
          <p className="text-xs text-stone-400">기관명</p>
          <p className="font-semibold text-stone-900">{org?.name}</p>
        </div>
        <div className="h-8 w-px bg-stone-100" />
        <div>
          <p className="text-xs text-stone-400">후원 페이지</p>
          <p className="font-medium text-stone-700">/donate/{org?.slug}</p>
        </div>
        <div className="h-8 w-px bg-stone-100" />
        <div>
          <p className="text-xs text-stone-400">문자후원 번호</p>
          {org?.smsFullNumber ? <Badge tone="blue">{org.smsFullNumber}</Badge> : <Badge tone="gray">미부여</Badge>}
        </div>
      </div>

      <OrgSettingsForm
        initial={{
          description: org?.description ?? "",
          address: org?.address ?? "",
          phone: org?.phone ?? "",
          email: org?.email ?? "",
          logoUrl: org?.logoUrl ?? "",
          bankName: org?.bankName ?? "",
          bankAccount: org?.bankAccount ?? "",
          bankHolder: org?.bankHolder ?? "",
        }}
      />
    </OrgLayout>
  );
}
