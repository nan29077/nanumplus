import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PublicHeader, PublicFooter } from "@/components/layout/public-layout";
import { CampaignCard } from "@/components/donation/campaign-card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    where: { isPublished: true, deletedAt: null, status: { in: ["ACTIVE", "ENDED"] } },
    include: { organization: { select: { name: true } }, _count: { select: { donations: true } } },
    orderBy: [{ status: "asc" }, { endDate: "asc" }],
  });

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1 bg-warm-50">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="text-2xl font-bold text-stone-900">모금 캠페인</h1>
          <p className="mt-2 text-stone-500">사회복지기관들이 직접 만든 모금 캠페인에 참여해 보세요.</p>
          {campaigns.length === 0 ? (
            <div className="mt-10">
              <EmptyState title="진행 중인 캠페인이 없습니다" description="새로운 캠페인이 곧 시작됩니다." />
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((c) => (
                <Link key={c.id} href={`/campaigns/${c.slug}`}>
                  <CampaignCard
                    title={c.title}
                    orgName={c.organization.name}
                    coverImageUrl={c.coverImageUrl}
                    goalAmount={c.goalAmount}
                    currentAmount={c.currentAmount}
                    endDate={c.endDate}
                    donorCount={c._count.donations}
                    status={c.status}
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
