import Link from "next/link";
import { startOfMonth } from "date-fns";
import { Users, RefreshCw, UserPlus, HandCoins } from "lucide-react";
import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parsePageParam, formatKRW } from "@/lib/utils";
import { fmtKst, kstToUtc, nowKst } from "@/lib/kst-date";
import { OrgLayout } from "@/components/layout/org-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DonorTable, type DonorRow } from "@/components/donation/donor-table";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const EMPTY_CHANNELS = { SMS: 0, EASY_TRANSFER: 0, RECURRING_TRANSFER: 0, RECURRING_CARD: 0 };

export default async function OrgDonorsPage({ searchParams }: { searchParams: { page?: string } }) {
  const user = await requireOrgAdmin();
  const orgId = user.organizationId;
  const page = parsePageParam(searchParams.page);
  const skip = (page - 1) * PAGE_SIZE;
  const monthFrom = kstToUtc(startOfMonth(nowKst()));

  const [org, donors, totalCount, recurringDonorCount, newThisMonth, totalAgg] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
    prisma.donor.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
      select: {
        id: true, name: true, phone: true, email: true, isRecurring: true,
        memo: true, createdAt: true, donorAccountId: true,
      },
    }),
    prisma.donor.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.donor.count({ where: { organizationId: orgId, deletedAt: null, isRecurring: true } }),
    prisma.donor.count({ where: { organizationId: orgId, deletedAt: null, createdAt: { gte: monthFrom } } }),
    prisma.donation.aggregate({
      where: { organizationId: orgId, status: "COMPLETED", deletedAt: null },
      _sum: { amount: true },
    }),
  ]);

  const ids = donors.map((d) => d.id);

  // 페이지 내 후원자들의 집계 (정확한 누적/건수/최근일 + 채널분포 + 활성 정기 + 최근 타임라인)
  const [aggByDonor, chanByDonor, activeRecurring, recentRaw] = ids.length
    ? await Promise.all([
        prisma.donation.groupBy({
          by: ["donorId"],
          where: { donorId: { in: ids }, status: "COMPLETED", deletedAt: null },
          _sum: { amount: true }, _count: true, _max: { donatedAt: true },
        }),
        prisma.donation.groupBy({
          by: ["donorId", "channel"],
          where: { donorId: { in: ids }, status: "COMPLETED", deletedAt: null },
          _count: true,
        }),
        prisma.recurringDonation.groupBy({
          by: ["donorId"],
          where: { donorId: { in: ids }, status: "ACTIVE" },
          _count: true,
        }),
        prisma.donation.findMany({
          where: { donorId: { in: ids }, deletedAt: null },
          select: { donorId: true, amount: true, channel: true, status: true, donatedAt: true },
          orderBy: { donatedAt: "desc" },
          take: 800,
        }),
      ])
    : [[], [], [], []];

  const aggMap = new Map(aggByDonor.map((a) => [a.donorId, a]));
  const recurMap = new Map(activeRecurring.map((r) => [r.donorId, r._count]));
  const chanMap = new Map<string, Record<string, number>>();
  for (const c of chanByDonor) {
    if (!c.donorId) continue;
    const m = chanMap.get(c.donorId) ?? { ...EMPTY_CHANNELS };
    m[c.channel] = c._count;
    chanMap.set(c.donorId, m);
  }
  const recentMap = new Map<string, { amount: number; channel: string; status: string; date: string }[]>();
  for (const r of recentRaw) {
    if (!r.donorId) continue;
    const arr = recentMap.get(r.donorId) ?? [];
    if (arr.length < 8) {
      arr.push({ amount: r.amount, channel: r.channel, status: r.status, date: fmtKst(r.donatedAt, "yyyy.MM.dd") });
      recentMap.set(r.donorId, arr);
    }
  }

  const rows: DonorRow[] = donors.map((d) => {
    const a = aggMap.get(d.id);
    return {
      id: d.id,
      name: d.name,
      phone: d.phone,
      email: d.email,
      isRecurring: d.isRecurring,
      isLinked: !!d.donorAccountId,
      memo: d.memo,
      totalAmount: a?._sum.amount ?? 0,
      donationCount: a?._count ?? 0,
      activeRecurring: recurMap.get(d.id) ?? 0,
      lastDonatedAt: a?._max.donatedAt ? fmtKst(a._max.donatedAt, "yyyy-MM-dd") : null,
      createdAt: fmtKst(d.createdAt, "yyyy-MM-dd"),
      channels: { ...EMPTY_CHANNELS, ...(chanMap.get(d.id) ?? {}) },
      recent: recentMap.get(d.id) ?? [],
    };
  });

  const hasMore = skip + donors.length < totalCount;

  const stats = [
    { icon: Users, label: "전체 후원자", value: `${totalCount.toLocaleString("ko-KR")}명` },
    { icon: RefreshCw, label: "정기후원자", value: `${recurringDonorCount.toLocaleString("ko-KR")}명` },
    { icon: UserPlus, label: "이번 달 신규", value: `${newThisMonth.toLocaleString("ko-KR")}명` },
    { icon: HandCoins, label: "누적 후원금", value: formatKRW(totalAgg._sum.amount ?? 0) },
  ];

  return (
    <OrgLayout userName={user.name} orgName={org?.name ?? "기관"}>
      <PageHeader
        title="후원자 관리"
        description="채널별 후원 분포·정기후원·간편로그인 연동까지 한눈에. 연락처는 마스킹됩니다."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-card">
            <s.icon className="h-4 w-4 text-brand-600" strokeWidth={1.75} />
            <p className="mt-2 text-lg font-bold text-stone-900">{s.value}</p>
            <p className="text-[11px] text-stone-400">{s.label}</p>
          </div>
        ))}
      </div>

      <DonorTable donors={rows} showCsv />
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Link
            href={`?page=${page + 1}`}
            className="rounded-xl border border-stone-200 bg-white px-6 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            더 보기 ({totalCount - skip - donors.length}명 남음)
          </Link>
        </div>
      )}
    </OrgLayout>
  );
}
