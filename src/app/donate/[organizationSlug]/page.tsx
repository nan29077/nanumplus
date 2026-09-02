import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { startOfMonth } from "date-fns";
import { Users, HandCoins, CalendarDays, Globe, Instagram, Youtube, Facebook, Link2, ArrowRight, MessageCircle, AtSign, BookOpenText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatKRW, formatNumber } from "@/lib/utils";
import { kstToUtc, nowKst, fmtKst } from "@/lib/kst-date";
import { DonateActions } from "@/components/donation/donate-actions";
import { CampaignCard } from "@/components/donation/campaign-card";
import { SmsDonationGrid } from "@/components/donation/sms-donation-card";
import { Faq } from "@/components/donation/faq";
import { getOrganizationAvatar } from "@/lib/organization-avatar";
import { getDefaultDonationBanner, LINK_TYPE_BUTTON_LABELS, resolveDonationPage, type LinkButtonType } from "@/lib/donation-page";
import { getDonorSession } from "@/lib/donor-auth";
import { DonateShell } from "@/components/donation/donate-shell";

export const dynamic = "force-dynamic";

const LINK_ICON: Record<LinkButtonType, typeof Globe> = {
  home: Globe,
  instagram: Instagram,
  youtube: Youtube,
  facebook: Facebook,
  blog: BookOpenText,
  kakao: MessageCircle,
  x: AtSign,
  link: Link2,
};
const LINK_COLOR: Partial<Record<LinkButtonType, string>> = {
  instagram: "#C13584",
  youtube: "#FF0000",
  facebook: "#1877F2",
  blog: "#03C75A",
  kakao: "#3C1E1E",
  x: "#111827",
};

export default async function DonatePage({ params, searchParams }: { params: { organizationSlug: string }; searchParams: { pay?: string } }) {
  const org = await prisma.organization.findUnique({
    where: { slug: params.organizationSlug },
    include: { donationPage: true },
  });
  if (!org || !org.isActive || org.deletedAt) notFound();

  const cfg = resolveDonationPage(org.donationPage);
  const heroImageUrl = cfg.heroImageUrl || getDefaultDonationBanner(org.id);
  const donor = await getDonorSession();
  const theme = cfg.themeColor;

  if (!cfg.isPublished) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-50 px-4">
        <div className="rounded-3xl border border-stone-200 bg-white px-8 py-16 text-center shadow-card">
          <h1 className="text-lg font-bold text-stone-900">{org.name}</h1>
          <p className="mt-2 text-sm text-stone-500">후원 페이지를 준비하고 있습니다. 곧 찾아뵐게요.</p>
        </div>
      </div>
    );
  }

  const monthFrom = kstToUtc(startOfMonth(nowKst()));
  const [total, month, donorCount, campaigns, smsFeed] = await Promise.all([
    prisma.donation.aggregate({ where: { organizationId: org.id, status: "COMPLETED", deletedAt: null }, _sum: { amount: true } }),
    prisma.donation.aggregate({ where: { organizationId: org.id, status: "COMPLETED", deletedAt: null, donatedAt: { gte: monthFrom } }, _sum: { amount: true } }),
    prisma.donor.count({ where: { organizationId: org.id, deletedAt: null } }),
    cfg.showCampaigns
      ? prisma.campaign.findMany({
          where: { organizationId: org.id, isPublished: true, deletedAt: null, status: { in: ["ACTIVE", "ENDED"] } },
          include: { _count: { select: { donations: true } } },
          orderBy: [{ status: "asc" }, { endDate: "asc" }], take: 2,
        }).catch(() => [])
      : Promise.resolve([] as never[]),
    cfg.showSmsFeed
      ? prisma.donation.findMany({
          where: { organizationId: org.id, channel: "SMS", deletedAt: null },
          orderBy: { donatedAt: "desc" }, take: 12,
          select: { id: true, smsBody: true, senderPhone: true, donatedAt: true, amount: true, status: true },
        }).catch(() => [])
      : Promise.resolve([] as never[]),
  ]);

  const shellOrg = {
    name: org.name, slug: org.slug,
    logoUrl: cfg.logoUrl || org.logoUrl || null,
    description: org.description, address: org.address, phone: org.phone, email: org.email,
  };

  return (
    <DonateShell org={shellOrg} themeColor={theme} donor={donor ? { name: donor.name, image: donor.image } : null} active="home">
      {/* 배너 */}
      <section className="relative -mx-4 min-h-[300px] overflow-hidden sm:mx-0 sm:mt-5 sm:min-h-[360px] sm:rounded-[2rem] sm:shadow-xl">
        <Image src={heroImageUrl} alt={`${org.name} 후원페이지 대표 배너`} fill priority unoptimized className="object-cover" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(110deg, ${theme}e8 0%, ${theme}a8 43%, rgba(20,32,27,.14) 78%)` }} />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-stone-950/25 to-transparent" />
        <div className="relative z-10 flex min-h-[300px] flex-col justify-end px-6 pb-16 pt-16 text-white sm:min-h-[360px] sm:px-10 sm:pb-20">
          <span className="mb-4 w-fit rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">함께 만드는 따뜻한 변화</span>
          <h1 className="max-w-lg text-3xl font-bold leading-tight drop-shadow-sm sm:text-4xl">
            {cfg.heroTitle || `${org.name}과 함께 나눔을 시작해요`}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/90 drop-shadow-sm sm:text-base">
            {cfg.heroSubtitle || "작은 마음이 모여 이웃의 오늘을 바꾸고, 더 따뜻한 내일을 만듭니다."}
          </p>
        </div>
      </section>

      {searchParams?.pay === "return" && (
        <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-center text-sm text-sky-800">
          결제 확인 중이에요. 완료되면 잠시 후 후원 내역에 자동 반영됩니다.
        </div>
      )}

      {/* 기관 카드 + 후원 */}
      <div className="relative z-20 -mt-10 rounded-[2rem] border border-white/80 bg-white/95 p-6 text-center shadow-xl backdrop-blur sm:mx-5 sm:p-8">
        <span className="relative mx-auto block h-20 w-20 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-lg">
          <Image src={cfg.logoUrl || org.logoUrl || getOrganizationAvatar(org.name)} alt={`${org.name}`} fill sizes="64px" className="object-cover" unoptimized />
        </span>
        <h2 className="mt-4 text-2xl font-bold text-stone-900">{org.name}</h2>
        {org.description && <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-stone-500">{org.description}</p>}

        {cfg.showStats && (
          <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-2xl bg-[#faf6ed] px-2 py-4">
              <HandCoins className="mx-auto h-4 w-4" strokeWidth={1.75} style={{ color: theme }} />
              <p className="mt-1.5 text-sm font-bold text-stone-900">{formatKRW(total._sum.amount ?? 0)}</p>
              <p className="text-[11px] text-stone-400">누적 모금액</p>
            </div>
            <div className="rounded-2xl bg-[#f7f1e8] px-2 py-4">
              <CalendarDays className="mx-auto h-4 w-4" strokeWidth={1.75} style={{ color: theme }} />
              <p className="mt-1.5 text-sm font-bold text-stone-900">{formatKRW(month._sum.amount ?? 0)}</p>
              <p className="text-[11px] text-stone-400">이번 달</p>
            </div>
            <div className="rounded-2xl bg-[#f2f6ef] px-2 py-4">
              <Users className="mx-auto h-4 w-4" strokeWidth={1.75} style={{ color: theme }} />
              <p className="mt-1.5 text-sm font-bold text-stone-900">{formatNumber(donorCount)}명</p>
              <p className="text-[11px] text-stone-400">후원 참여자</p>
            </div>
          </div>
        )}

        <p className="mx-auto mt-6 max-w-lg rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed" style={{ backgroundColor: `${theme}12`, color: theme }}>
          {cfg.thankYouTitle || `여러분의 후원은 ${org.name}의 이웃들에게 전달됩니다.`}
        </p>

        <DonateActions
          orgSlug={org.slug} orgId={org.id} orgName={org.name} smsNumber={org.smsFullNumber}
          enabledChannels={cfg.enabledChannels} suggestedAmounts={cfg.suggestedAmounts} themeColor={theme}
          thankYou={{ title: cfg.thankYouTitle, message: cfg.thankYouMessage }}
          donor={donor ? { name: donor.name, email: donor.email } : undefined}
        />

        {!donor && (
          <p className="mt-3 text-center text-xs text-stone-400">
            로그인하면 후원 내역을 관리할 수 있어요 (우측 · 모바일 상단 로그인)
          </p>
        )}
      </div>

      {/* 링크 버튼 (홈페이지·SNS) — 새 탭 */}
      {cfg.links.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {cfg.links.map((l, i) => {
            const Icon = LINK_ICON[l.type];
            const linkColor = LINK_COLOR[l.type] || theme;
            return (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl border bg-white px-3 py-3 text-sm font-semibold text-stone-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderColor: `${linkColor}26`, backgroundColor: `${linkColor}08` }}>
                <Icon className="h-4 w-4" strokeWidth={1.9} style={{ color: linkColor }} />
                <span className="truncate">{l.label || LINK_TYPE_BUTTON_LABELS[l.type]}</span>
              </a>
            );
          })}
        </div>
      )}

      {/* 소개 */}
      {(cfg.introTitle || cfg.introBody) && (
        <section className="mt-8 overflow-hidden rounded-[2rem] border border-stone-200 bg-gradient-to-br from-white to-[#fbf6ec] p-6 shadow-card sm:p-8">
          {cfg.introTitle && <h2 className="text-lg font-bold text-stone-900">{cfg.introTitle}</h2>}
          {cfg.introBody && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">{cfg.introBody}</p>}
        </section>
      )}

      {/* 스토리 블록 */}
      {cfg.blocks.length > 0 && (
        <section className="mt-6 space-y-5">
          {cfg.blocks.map((b, i) => {
            if (b.type === "text") return (
              <div key={i} className="rounded-[2rem] border border-stone-200 bg-gradient-to-br from-white to-[#fcf8f0] p-6 shadow-card sm:p-8">
                {b.heading && <h3 className="text-base font-bold text-stone-900">{b.heading}</h3>}
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">{b.body}</p>
              </div>
            );
            if (b.type === "quote") return (
              <blockquote key={i} className="rounded-[2rem] border-l-4 bg-white p-7 shadow-card sm:p-8" style={{ borderColor: theme }}>
                <p className="text-base italic leading-relaxed text-stone-700">&ldquo;{b.body}&rdquo;</p>
                {b.author && <footer className="mt-2 text-sm text-stone-400">— {b.author}</footer>}
              </blockquote>
            );
            return (
              <figure key={i} className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.imageUrl} alt={b.caption ?? ""} className="aspect-[16/9] w-full object-cover" />
                {b.caption && <figcaption className="px-5 py-3 text-center text-xs text-stone-400">{b.caption}</figcaption>}
              </figure>
            );
          })}
        </section>
      )}

      {/* 진행 캠페인 미리보기 */}
      {cfg.showCampaigns && campaigns.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">진행 중인 캠페인</h2>
            <Link href={`/donate/${org.slug}/campaigns`} className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: theme }}>
              전체 보기 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {campaigns.map((c) => (
              <Link key={c.id} href={`/donate/${org.slug}/campaigns/${c.slug}`} className="block h-full">
                <CampaignCard title={c.title} orgName={org.name} coverImageUrl={c.coverImageUrl}
                  goalAmount={c.goalAmount} currentAmount={c.currentAmount} endDate={c.endDate}
                  donorCount={c._count.donations} status={c.status} allowedChannels={c.allowedChannels} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 문자후원 내역 피드 */}
      {cfg.showSmsFeed && smsFeed.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-stone-900">문자후원 내역</h2>
          <SmsDonationGrid rows={smsFeed.map((d) => ({
            id: d.id, smsBody: d.smsBody, senderPhone: d.senderPhone,
            donatedAt: d.donatedAt.toISOString(), amount: d.amount, status: d.status,
          }))} />
        </section>
      )}

      {/* FAQ */}
      {cfg.showFaq && (
        <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-card sm:p-7">
          <h2 className="mb-4 text-lg font-bold text-stone-900">자주 묻는 질문</h2>
          <Faq />
        </section>
      )}
    </DonateShell>
  );
}
