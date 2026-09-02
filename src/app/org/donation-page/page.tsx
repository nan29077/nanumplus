import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { OrgLayout } from "@/components/layout/org-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DonationPageForm } from "@/components/org/donation-page-form";
import { getDefaultDonationBanner, resolveDonationPage } from "@/lib/donation-page";

export const dynamic = "force-dynamic";

export default async function OrgDonationPageSettings() {
  const user = await requireOrgAdmin();
  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { id: true, name: true, slug: true },
  });
  const row = await prisma.donationPage.findUnique({
    where: { organizationId: user.organizationId },
  });
  const config = resolveDonationPage(row);
  if (!config.heroImageUrl && org?.id) config.heroImageUrl = getDefaultDonationBanner(org.id);

  return (
    <OrgLayout userName={user.name} orgName={org?.name ?? "기관"}>
      <PageHeader
        title="후원페이지 설정"
        description={`후원자에게 보이는 /donate/${org?.slug ?? ""} 페이지를 직접 꾸밉니다.`}
      />
      <DonationPageForm slug={org?.slug ?? ""} initial={config} />
    </OrgLayout>
  );
}
