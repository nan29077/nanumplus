import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { startOfMonth } from "date-fns";
import { Users, HandCoins, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatKRW, formatNumber } from "@/lib/utils";
import { kstToUtc, nowKst } from "@/lib/kst-date";
import { PublicHeader, PublicFooter } from "@/components/layout/public-layout";
import { DonateActions } from "@/components/donation/donate-actions";
import { CampaignCard } from "@/components/donation/campaign-card";
import { Faq } from "@/components/donation/faq";
import { getOrganizationAvatar } from "@/lib/organization-avatar";
import { resolveDonationPage } from "@/lib/donation-page";
import { getDonorSession } from "@/lib/donor-auth";

export const dynamic = "force-dynamic";

export default async function DonatePage({
  params,
}: { params: { organizationSlug: string } }) {
  const org = await prisma.organization.findUnique({
    where: { slug: params.organizationSlug },
    include: { donationPage: true },
  });
  if (!org || !org.isActive || org.deletedAt) notFound();

  const cfg = resolveDonationPage(org.donationPage);
  const donor = await getDonorSession();

  // 비공개 상태
  if (!cfg.isPublished) {
    return (
      <div className="flex min-h-screen flex-col">
        <PublicHeader />
        <main className="flex flex-1 items-center justify-center bg-warm-50 px-4">
          <div className="rounded-3xl border border-stone-200 bg-white px-8 py-16 text-center shadow-card">
            <h1 className="text-lg font-bold text-stone-900">{org.name}</h1>
            <p className="mt-2 text-sm text-stone-500">후원 페이지를 준비하고 있습니다. 곧 찾아뵐게요.</p>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const monthFrom = kstToUtc(startOfMonth(nowKst()));
  const [total, month, donorCount, campaigns] = await Promise.all([
    prisma.donation.aggregate({
      where: { organizationId: org.id, status: "COMPLETED", deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.donation.aggregate({
      where: { organizationId: org.id, status: "COMPLETED", deletedAt: null, donatedAt: { gte: monthFrom } },
      _sum: { amount: true },
    }),
    prisma.donor.count({ where: { organizationId: org.id, deletedAt: null } }),
    cfg.showCampaigns
      ? prisma.campaign.findMany({
          where: {
            organizationId: org.id, isPublished: true, deletedAt: null,
            status: { in: ["ACTIVE", "ENDED"] },
          },
          include: { _count: { select: { donations: true } } },
          orderBy: [{ status: "asc" }, { endDate: "asc" }],
          take: 4,
        }).catch(() => [])
      : Promise.resolve([] as never[]),
  ]);

  const theme = cfg.themeColor;

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1 bg-warm-50 pb-28">
        {/* 히어로 */}
        {cfg.heroImageUrl ? (
          <div className="relative h-56 w-full overflow-hidden sm:h-72">
            <Image src={cfg.heroImageUrl} alt="" fill unoptimized className="object-cover" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(0,0,0,0.15), ${theme}cc)` }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
              {cfg.heroTitle && <h1 className="text-2xl font-bold drop-shadow sm:text-3xl">{cfg.heroTitle}</h1>}
              {cfg.heroSubtitle && <p className="mt-2 max-w-xl text-sm text-white/90 drop-shadow">{cfg.heroSubtitle}</p>}
            </div>
          </div>
        ) : (
          (cfg.heroTitle || cfg.heroSubtitle) && (
            <div className="px-6 py-12 text-center text-white" style={{ background: `linear-gradient(135deg, ${theme}, ${theme}cc)` }}>
              {cfg.heroTitle && <h1 className="text-2xl font-bold sm:text-3xl">{cfg.heroTitle}</h1>}
              {cfg.heroSubtitle && <p className="mt-2 text-sm text-white/90">{cfg.heroSubtitle}</p>}
            </div>
          )
        )}

        <div className="mx-auto max-w-2xl px-4 py-10">
          {/* 기관 카드 */}
          <div className="rounded-3xl border border-stone-200 bg-white p-7 text-center shadow-card">
            {org.logoUrl ? (
              <Image src={org.logoUrl} alt={`${org.name} 로고`} width={64} height={64} unoptimized className="mx-auto rounded-2xl object-cover" />
            ) : (
              <span className="relative mx-auto block h-16 w-16 overflow-hidden rounded-2xl border-2 border-white bg-white shadow-sm">
                <Image src={getOrganizationAvatar(org.name)} alt={`${org.name} 프로필 캐릭터`} fill sizes="64px" className="object-cover" />
              </span>
            )}
            <h1 className="mt-4 text-xl font-bold text-stone-900">{org.name}</h1>
            {org.description && (
              <p className="mt-2 text-sm leading-relaxed text-stone-500">{org.description}</p>
            )}

            {cfg.showStats && (
              <div className="mt-6 grid grid-cols-3 divide-x divide-stone-100 rounded-2xl bg-stone-50 py-4">
                <div className="px-2">
                  <HandCoins className="mx-auto h-4 w-4" strokeWidth={1.75} style={{ color: theme }} />
                  <p className="mt-1.5 text-sm font-bold text-stone-900">{formatKRW(total._sum.amount ?? 0)}</p>
                  <p className="text-[11px] text-stone-400">누적 모금액</p>
                </div>
                <div className="px-2">
                  <CalendarDays className="mx-auto h-4 w-4" strokeWidth={1.75} style={{ color: theme }} />
                  <p className="mt-1.5 text-sm font-bold text-stone-900">{formatKRW(month._sum.amount ?? 0)}</p>
                  <p className="text-[11px] text-stone-400">이번 달 모금액</p>
                </div>
                <div className="px-2">
                  <Users className="mx-auto h-4 w-4" strokeWidth={1.75} style={{ color: theme }} />
                  <p className="mt-1.5 text-sm font-bold text-stone-900">{formatNumber(donorCount)}명</p>
                  <p className="text-[11px] text-stone-400">후원 참여자</p>
                </div>
              </div>
            )}

            <p className="mt-6 rounded-2xl px-4 py-3 text-sm leading-relaxed" style={{ backgroundColor: `${theme}12`, color: theme }}>
              {cfg.thankYouTitle || `여러분의 후원은 ${org.name}의 이웃들에게 전달됩니다.`}
            </p>

            <DonateActions
              orgSlug={org.slug}
              orgId={org.id}
              orgName={org.name}
              smsNumber={org.smsFullNumber}
              enabledChannels={cfg.enabledChannels}
              suggestedAmounts={cfg.suggestedAmounts}
              themeColor={theme}
              thankYou={{ title: cfg.thankYouTitle, message: cfg.thankYouMessage }}
              donor={donor ? { name: donor.name, email: donor.email } : undefined}
            />

            {donor ? (
              <p className="mt-4 text-center text-xs text-stone-400">
                {donor.name} 님으로 로그인됨 ·{" "}
                <Link href="/my" className="font-medium" style={{ color: theme }}>내 후원내역</Link>
              </p>
            ) : (
              <p className="mt-4 text-center text-xs text-stone-400">
                <Link href={`/donor/login?callbackUrl=/donate/${org.slug}`} className="font-medium" style={{ color: theme }}>
                  카카오·네이버로 로그인
                </Link>
                하고 후원내역을 관리하세요
              </p>
            )}
          </div>

          {/* 소개 */}
          {(cfg.introTitle || cfg.introBody) && (
            <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-7 shadow-card">
              {cfg.introTitle && <h2 className="text-lg font-bold text-stone-900">{cfg.introTitle}</h2>}
              {cfg.introBody && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">{cfg.introBody}</p>}
            </section>
          )}

          {/* 스토리 블록 */}
          {cfg.blocks.length > 0 && (
            <section className="mt-6 space-y-5">
              {cfg.blocks.map((b, i) => {
                if (b.type === "text") {
                  return (
                    <div key={i} className="rounded-3xl border border-stone-200 bg-white p-7 shadow-card">
                      {b.heading && <h3 className="text-base font-bold text-stone-900">{b.heading}</h3>}
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">{b.body}</p>
                    </div>
                  );
                }
                if (b.type === "quote") {
                  return (
                    <blockquote key={i} className="rounded-3xl border-l-4 bg-white p-7 shadow-card" style={{ borderColor: theme }}>
                      <p className="text-base italic leading-relaxed text-stone-700">&ldquo;{b.body}&rdquo;</p>
                      {b.author && <footer className="mt-2 text-sm text-stone-400">— {b.author}</footer>}
                    </blockquote>
                  );
                }
                return (
                  <figure key={i} className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.imageUrl} alt={b.caption ?? ""} className="w-full object-cover" />
                    {b.caption && <figcaption className="px-5 py-3 text-center text-xs text-stone-400">{b.caption}</figcaption>}
                  </figure>
                );
              })}
            </section>
          )}

          {/* 진행 캠페인 */}
          {cfg.showCampaigns && campaigns.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-4 text-lg font-bold text-stone-900">진행 중인 캠페인</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {campaigns.map((c) => (
                  <Link key={c.id} href={`/campaigns/${c.slug}`} className="block h-full">
                    <CampaignCard
                      title={c.title}
                      orgName={org.name}
                      coverImageUrl={c.coverImageUrl}
                      goalAmount={c.goalAmount}
                      currentAmount={c.currentAmount}
                      endDate={c.endDate}
                      donorCount={c._count.donations}
                      status={c.status}
                      allowedChannels={c.allowedChannels}
                    />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* FAQ */}
          {cfg.showFaq && (
            <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-7 shadow-card">
              <h2 className="mb-4 text-lg font-bold text-stone-900">자주 묻는 질문</h2>
              <Faq />
            </section>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
