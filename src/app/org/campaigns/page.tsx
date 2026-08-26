import Link from "next/link";
import { Plus, Megaphone } from "lucide-react";
import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parseStatusParam } from "@/lib/utils";
import { OrgLayout } from "@/components/layout/org-layout";
import { PageHeader } from "@/components/layout/page-header";
import { OrgCampaignCard } from "@/components/donation/campaign-card";

export const dynamic = "force-dynamic";

export default async function OrgCampaignsPage({
  searchParams,
}: { searchParams: { status?: string } }) {
  const user = await requireOrgAdmin();

  // status 화이트리스트 검증 — 잘못된 값은 무시하고 전체 조회로 폴백
  const status = parseStatusParam(searchParams.status,
    ["DRAFT", "ACTIVE", "ENDED", "CLOSED"] as const);

  const [org, campaigns] = await Promise.all([
    prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }),
    prisma.campaign.findMany({
      where: {
        organizationId: user.organizationId,
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { donations: { where: { status: "COMPLETED", deletedAt: null } } } } },
    }),
  ]);

  const statusFilters = [
    { label: "전체", value: "" },
    { label: "진행 중", value: "ACTIVE" },
    { label: "임시저장", value: "DRAFT" },
    { label: "종료", value: "ENDED" },
    { label: "마감", value: "CLOSED" },
  ];

  return (
    <OrgLayout userName={user.name} orgName={org?.name ?? "기관"}>
      <PageHeader
        title="모금 캠페인"
        description="캠페인을 만들고 후원 채널을 선택해 모금을 시작하세요."
        action={
          <Link
            href="/org/campaigns/new"
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} /> 캠페인 만들기
          </Link>
        }
      />

      {/* 상태 필터 탭 */}
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 py-20 text-center">
          <Megaphone className="mb-3 h-10 w-10 text-stone-300" strokeWidth={1.5} />
          <p className="font-semibold text-stone-500">
            {searchParams.status ? "해당 상태의 캠페인이 없습니다" : "아직 캠페인이 없습니다"}
          </p>
          <p className="mt-1 text-sm text-stone-400">
            캠페인을 만들어 후원 모금을 시작해 보세요.
          </p>
          <Link
            href="/org/campaigns/new"
            className="mt-5 flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} /> 첫 캠페인 만들기
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => (
            <OrgCampaignCard
              key={c.id}
              id={c.id}
              title={c.title}
              coverImageUrl={c.coverImageUrl ?? null}
              goalAmount={c.goalAmount}
              currentAmount={c.currentAmount}
              endDate={c.endDate}
              donorCount={c._count.donations}
              status={c.status}
              isPublished={c.isPublished}
              allowedChannels={(c as { allowedChannels?: string | null }).allowedChannels ?? null}
              slug={c.slug}
            />
          ))}
        </div>
      )}
    </OrgLayout>
  );
}
