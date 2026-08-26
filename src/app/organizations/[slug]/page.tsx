import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { startOfMonth } from "date-fns";
import {
  ArrowRight, CalendarDays, HandCoins, Heart, Mail, MapPin,
  MessageSquare, Phone, ShieldCheck, Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatKRW, formatNumber } from "@/lib/utils";
import { kstToUtc, nowKst } from "@/lib/kst-date";
import { CampaignCard } from "@/components/donation/campaign-card";
import { PublicFooter, PublicHeader } from "@/components/layout/public-layout";
import { getOrganizationAvatar } from "@/lib/organization-avatar";

export const dynamic = "force-dynamic";

export default async function OrganizationDetailPage({ params }: { params: { slug: string } }) {
  const organization = await prisma.organization.findFirst({
    where: { slug: params.slug, isActive: true, deletedAt: null },
    include: {
      campaigns: {
        where: { isPublished: true, deletedAt: null, status: { in: ["ACTIVE", "ENDED"] } },
        include: { _count: { select: { donations: { where: { status: "COMPLETED", deletedAt: null } } } } },
        orderBy: [{ status: "asc" }, { endDate: "asc" }],
      },
    },
  });
  if (!organization) notFound();

  const monthFrom = kstToUtc(startOfMonth(nowKst()));
  const [total, month, donorCount] = await Promise.all([
    prisma.donation.aggregate({
      where: { organizationId: organization.id, status: "COMPLETED", deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.donation.aggregate({
      where: { organizationId: organization.id, status: "COMPLETED", deletedAt: null, donatedAt: { gte: monthFrom } },
      _sum: { amount: true },
    }),
    prisma.donor.count({ where: { organizationId: organization.id, deletedAt: null } }),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[#fbf8f3]">
      <PublicHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-[#eadfce] bg-gradient-to-br from-[#f5eadc] via-[#fbf8f3] to-[#e9f3ec]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#e2eee4] blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[1fr_360px] lg:py-20">
            <div>
              <div className="flex items-center gap-4">
                {organization.logoUrl ? (
                  <span className="relative h-20 w-20 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-lg">
                    <Image src={organization.logoUrl} alt={`${organization.name} 로고`} fill unoptimized className="object-cover" />
                  </span>
                ) : (
                  <span className="relative h-20 w-20 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-lg">
                    <Image src={getOrganizationAvatar(organization.name)} alt={`${organization.name} 프로필 캐릭터`} fill sizes="80px" className="object-cover" />
                  </span>
                )}
                <div>
                  <p className="text-sm font-semibold text-[#bd7358]">나눔플러스 참여 기관</p>
                  <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">{organization.name}</h1>
                </div>
              </div>
              <p className="mt-7 max-w-2xl whitespace-pre-line text-base leading-8 text-stone-600">
                {organization.description || "지역사회의 이웃들이 더 건강하고 행복한 일상을 살아가도록 가장 가까운 곳에서 함께합니다."}
              </p>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-500">
                {organization.address && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-brand-600" />{organization.address}</span>}
                {organization.phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-brand-600" />{organization.phone}</span>}
                {organization.email && <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-brand-600" />{organization.email}</span>}
              </div>
            </div>

            <div className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_18px_55px_rgba(78,57,38,0.12)] backdrop-blur">
              <p className="text-sm font-semibold text-stone-700">이 기관의 나눔 현황</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#f8f3eb] p-4">
                  <HandCoins className="h-5 w-5 text-[#bd7358]" />
                  <p className="mt-3 text-lg font-bold text-stone-900">{formatKRW(total._sum.amount ?? 0)}</p>
                  <p className="mt-1 text-xs text-stone-400">누적 모금액</p>
                </div>
                <div className="rounded-2xl bg-[#eef6f0] p-4">
                  <Users className="h-5 w-5 text-brand-600" />
                  <p className="mt-3 text-lg font-bold text-stone-900">{formatNumber(donorCount)}명</p>
                  <p className="mt-1 text-xs text-stone-400">함께한 후원자</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-2xl border border-stone-100 px-4 py-3">
                <span className="flex items-center gap-2 text-xs text-stone-500"><CalendarDays className="h-4 w-4 text-brand-600" />이번 달 모금</span>
                <strong className="text-sm text-stone-800">{formatKRW(month._sum.amount ?? 0)}</strong>
              </div>
              <Link href={`/donate/${organization.slug}`} className="mt-4 flex items-center justify-center gap-2 rounded-full bg-brand-700 px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-800">
                <Heart className="h-4 w-4" /> 이 기관 후원하기
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "투명한 기록", desc: "전달된 후원은 채널과 날짜별로 안전하게 기록됩니다." },
              { icon: MessageSquare, title: "쉬운 참여", desc: "문자, 간편 계좌이체, 정기후원 중 편한 방법을 선택하세요." },
              { icon: Heart, title: "지속되는 변화", desc: "모인 마음은 기관의 현장 활동과 캠페인으로 이어집니다." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-[#eee3d5] bg-white p-5">
                <item.icon className="h-5 w-5 text-[#bd7358]" />
                <h2 className="mt-3 font-semibold text-stone-900">{item.title}</h2>
                <p className="mt-1.5 text-sm leading-6 text-stone-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-[#eee4d7] bg-white py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-brand-600">기관 캠페인</p>
                <h2 className="mt-2 text-2xl font-bold text-stone-900">함께 만드는 변화의 이야기</h2>
                <p className="mt-2 text-stone-500">{organization.name}이 직접 전하는 캠페인을 만나보세요.</p>
              </div>
              <Link href="/campaigns" className="hidden items-center gap-1 text-sm font-semibold text-brand-700 sm:flex">모든 캠페인 <ArrowRight className="h-4 w-4" /></Link>
            </div>

            {organization.campaigns.length > 0 ? (
              <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {organization.campaigns.map((campaign) => (
                  <Link key={campaign.id} href={`/campaigns/${campaign.slug}`}>
                    <CampaignCard
                      title={campaign.title}
                      orgName={organization.name}
                      coverImageUrl={campaign.coverImageUrl}
                      goalAmount={campaign.goalAmount}
                      currentAmount={campaign.currentAmount}
                      endDate={campaign.endDate}
                      donorCount={campaign._count.donations}
                      status={campaign.status}
                      allowedChannels={campaign.allowedChannels}
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-9 rounded-3xl bg-[#f8f4ed] px-6 py-12 text-center text-sm text-stone-500">
                현재 공개된 캠페인은 없지만, 기관을 직접 후원해 지속적인 활동을 응원할 수 있습니다.
              </div>
            )}
          </div>
        </section>

        <section className="px-4 py-16">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 rounded-3xl bg-[#365f4e] px-7 py-10 text-center sm:flex-row sm:text-left">
            <div>
              <p className="text-sm font-semibold text-[#cfe4d8]">따뜻한 마음을 지금 전해보세요</p>
              <h2 className="mt-2 text-2xl font-bold text-white">당신의 나눔이 {organization.name}의 내일을 만듭니다.</h2>
            </div>
            <Link href={`/donate/${organization.slug}`} className="shrink-0 rounded-full bg-[#fff7eb] px-6 py-3 text-sm font-semibold text-[#365f4e] hover:bg-white">
              후원 방법 선택하기
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
