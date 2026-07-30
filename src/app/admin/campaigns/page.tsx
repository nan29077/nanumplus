import { requireSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { CampaignCard } from "@/components/donation/campaign-card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage({
  searchParams,
}: { searchParams: { status?: string } }) {
  const user = await requireSuperAdmin();

  const campaigns = await prisma.campaign.findMany({
    where: {
      deletedAt: null,
      ...(searchParams.status ? { status: searchParams.status as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      organization: { select: { name: true } },
      _count: { select: { donations: true } },
    },
  });

  const statusFilters = [
    { label: "전체", value: "" },
    { label: "진행 중", value: "ACTIVE" },
    { label: "임시저장", value: "DRAFT" },
    { label: "종료", value: "ENDED" },
    { label: "마감", value: "CLOSED" },
  ];

  return (
    <AdminLayout userName={user.name}>
      <PageHeader
        title="캠페인"
        description={`전체 기관의 모금 캠페인 ${campaigns.length}개`}
      />

      {/* 상태 필터 */}
      <div className="mb-5 flex flex-wrap gap-2">
        {statusFilters.map((f) => (
          <a
            key={f.value}
            href={f.value ? `?status=${f.value}` : "?"}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              (searchParams.status ?? "") === f.value
                ? "bg-brand-600 text-white"
                : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          title="캠페인이 없습니다"
          description="기관에서 캠페인을 등록하면 여기에 표시됩니다."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              title={c.title}
              orgName={c.organization.name}
              coverImageUrl={c.coverImageUrl ?? null}
              goalAmount={c.goalAmount}
              currentAmount={c.currentAmount}
              endDate={c.endDate}
              donorCount={c._count.donations}
              status={c.status}
              allowedChannels={(c as { allowedChannels?: string | null }).allowedChannels ?? null}
              slug={c.slug}
            />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
