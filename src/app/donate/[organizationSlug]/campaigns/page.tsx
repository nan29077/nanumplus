import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveDonationPage } from "@/lib/donation-page";
import { getDonorSession } from "@/lib/donor-auth";
import { DonateShell } from "@/components/donation/donate-shell";
import { CampaignCard } from "@/components/donation/campaign-card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function OrgCampaignsPage({ params }: { params: { organizationSlug: string } }) {
  const org = await prisma.organization.findUnique({
    where: { slug: params.organizationSlug },
    include: { donationPage: true },
  });
  if (!org || !org.isActive || org.deletedAt) notFound();

  const cfg = resolveDonationPage(org.donationPage);
  const donor = await getDonorSession();
  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: org.id, isPublished: true, deletedAt: null, status: { in: ["ACTIVE", "ENDED", "CLOSED"] } },
    include: { _count: { select: { donations: true } } },
    orderBy: [{ status: "asc" }, { endDate: "asc" }],
  }).catch(() => []);

  const shellOrg = {
    name: org.name, slug: org.slug, logoUrl: cfg.logoUrl || org.logoUrl || null,
    description: org.description, address: org.address, phone: org.phone, email: org.email,
  };

  return (
    <DonateShell org={shellOrg} themeColor={cfg.themeColor} donor={donor ? { name: donor.name, image: donor.image } : null} active="campaigns">
      <h1 className="text-xl font-bold text-stone-900">모금 캠페인</h1>
      <p className="mt-1 text-sm text-stone-500">{org.name}이(가) 진행하는 캠페인이에요.</p>

      {campaigns.length === 0 ? (
        <div className="mt-6"><EmptyState title="진행 중인 캠페인이 없습니다" description="새로운 캠페인이 열리면 여기에 표시됩니다." /></div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/donate/${org.slug}/campaigns/${c.slug}`} className="block h-full">
              <CampaignCard title={c.title} orgName={org.name} coverImageUrl={c.coverImageUrl}
                goalAmount={c.goalAmount} currentAmount={c.currentAmount} endDate={c.endDate}
                donorCount={c._count.donations} status={c.status} allowedChannels={c.allowedChannels} />
            </Link>
          ))}
        </div>
      )}
    </DonateShell>
  );
}
