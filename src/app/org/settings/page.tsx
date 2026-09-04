import { ShieldAlert } from "lucide-react";
import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { OrgLayout } from "@/components/layout/org-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { OrgSettingsForm } from "@/components/org/org-settings-form";
import { OrgPasswordForm } from "@/components/org/org-password-form";

export const dynamic = "force-dynamic";

export default async function OrgSettingsPage({
  searchParams,
}: {
  searchParams?: { pwchange?: string };
}) {
  const user = await requireOrgAdmin();
  const mustChangePassword = searchParams?.pwchange === "1";
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

      {mustChangePassword && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" strokeWidth={1.75} />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">초기 비밀번호를 변경해 주세요.</p>
            <p className="mt-0.5 text-amber-700">
              관리자가 지정한 초기 비밀번호를 쓰고 있어 다른 화면을 이용할 수 없습니다.
              아래 &lsquo;비밀번호 변경&rsquo;에서 새 비밀번호를 설정하면 정상적으로 이용할 수 있습니다.
            </p>
          </div>
        </div>
      )}

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

      <OrgPasswordForm />
    </OrgLayout>
  );
}
