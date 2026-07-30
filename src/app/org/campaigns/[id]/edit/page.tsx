import { notFound } from "next/navigation";
import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { fmtKst } from "@/lib/kst-date";
import { OrgLayout } from "@/components/layout/org-layout";
import { PageHeader } from "@/components/layout/page-header";
import { CampaignForm } from "@/components/donation/campaign-form";

export const dynamic = "force-dynamic";

export default async function EditCampaignPage({ params }: { params: { id: string } }) {
  const user = await requireOrgAdmin();

  const [org, c] = await Promise.all([
    prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }),
    prisma.campaign.findFirst({ where: { id: params.id, organizationId: user.organizationId, deletedAt: null } }),
  ]);
  if (!c) notFound();

  return (
    <OrgLayout userName={user.name} orgName={org?.name ?? "기관"}>
      <PageHeader title="캠페인 수정" description={c.title} />
      <div className="max-w-3xl">
        <CampaignForm
          initial={{
            id: c.id,
            title: c.title,
            coverImageUrl: c.coverImageUrl,
            goalAmount: c.goalAmount,
            startDate: fmtKst(c.startDate, "yyyy-MM-dd"),
            endDate: fmtKst(c.endDate, "yyyy-MM-dd"),
            summary: c.summary,
            story: c.story,
            reason: c.reason,
            usagePlan: c.usagePlan,
            beneficiary: c.beneficiary,
            messageToDonors: c.messageToDonors,
            allowedChannels: (() => {
              try {
                const raw = (c as { allowedChannels?: string | null }).allowedChannels;
                return raw ? JSON.parse(raw) : null;
              } catch { return null; }
            })(),
            status: c.status,
            isPublished: c.isPublished,
          }}
        />
      </div>
    </OrgLayout>
  );
}
