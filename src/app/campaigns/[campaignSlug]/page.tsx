import { notFound } from "next/navigation";
import Image from "next/image";
import { CalendarClock, Users, Target, Quote } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatKRW, formatNumber } from "@/lib/utils";
import { fmtKst } from "@/lib/kst-date";
import { PublicHeader, PublicFooter } from "@/components/layout/public-layout";
import { DonateActions } from "@/components/donation/donate-actions";
import { resolveDonationPage, ALL_CHANNELS, type DonationChannelKey } from "@/lib/donation-page";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: { params: { campaignSlug: string } }) {
  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.campaignSlug },
    include: {
      organization: { include: { donationPage: true } },
      images: { orderBy: { sortOrder: "asc" } },
      _count: { select: { donations: { where: { status: "COMPLETED", deletedAt: null } } } },
    },
  });
  if (!campaign || !campaign.isPublished || campaign.deletedAt) notFound();
  // 비활성·삭제된 기관의 캠페인은 공개하지 않는다 (/donate, /organizations 페이지와 동일 정책)
  if (!campaign.organization.isActive || campaign.organization.deletedAt) notFound();

  const cfg = resolveDonationPage(campaign.organization.donationPage);
  // 캠페인이 허용 채널을 지정했으면 그것을, 아니면 기관 후원페이지 설정 채널을 사용
  let campaignChannels: DonationChannelKey[] = cfg.enabledChannels;
  if (campaign.allowedChannels) {
    try {
      const parsed = JSON.parse(campaign.allowedChannels) as unknown;
      if (Array.isArray(parsed)) {
        const set = new Set(ALL_CHANNELS as string[]);
        const picked = parsed.filter((x): x is DonationChannelKey => typeof x === "string" && set.has(x));
        if (picked.length) campaignChannels = ALL_CHANNELS.filter((c) => picked.includes(c));
      }
    } catch { /* keep cfg default */ }
  }
  const pct = Math.min(100, Math.round((campaign.currentAmount / Math.max(campaign.goalAmount, 1)) * 100));
  const daysLeft = Math.max(0, Math.ceil((campaign.endDate.getTime() - Date.now()) / 86_400_000));

  const sections = [
    { title: "상세 스토리", body: campaign.story },
    { title: "후원이 필요한 이유", body: campaign.reason },
    { title: "후원금 사용 계획", body: campaign.usagePlan },
    { title: "수혜 대상", body: campaign.beneficiary },
  ].filter((s) => s.body);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1 bg-warm-50 pb-32">
        {/* 대표 이미지 */}
        <div className="relative h-56 bg-gradient-to-br from-brand-200 to-brand-50 sm:h-72">
          {campaign.coverImageUrl && (
            <Image src={campaign.coverImageUrl} alt="" fill unoptimized className="object-cover" />
          )}
        </div>

        <div className="mx-auto max-w-3xl px-4">
          <div className="-mt-12 rounded-3xl border border-stone-200 bg-white p-6 shadow-card sm:p-8">
            <p className="text-sm text-brand-600">{campaign.organization.name}</p>
            <h1 className="mt-1 text-xl font-bold leading-snug text-stone-900 sm:text-2xl">
              {campaign.title}
            </h1>
            {campaign.summary && <p className="mt-3 text-sm leading-relaxed text-stone-500">{campaign.summary}</p>}

            {/* 달성률 */}
            <div className="mt-6">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-brand-700">{pct}%</span>
                <span className="text-sm text-stone-500">
                  목표 {formatKRW(campaign.goalAmount)}
                </span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-stone-100" role="progressbar"
                aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-lg font-bold text-stone-900">{formatKRW(campaign.currentAmount)} 모금</p>
            </div>

            <div className="mt-5 grid grid-cols-3 divide-x divide-stone-100 rounded-2xl bg-stone-50 py-4 text-center">
              <div className="px-2">
                <CalendarClock className="mx-auto h-4 w-4 text-brand-600" strokeWidth={1.75} />
                <p className="mt-1.5 text-sm font-bold text-stone-900">{daysLeft > 0 ? `${daysLeft}일` : "마감"}</p>
                <p className="text-[11px] text-stone-400">남은 기간</p>
              </div>
              <div className="px-2">
                <Users className="mx-auto h-4 w-4 text-brand-600" strokeWidth={1.75} />
                <p className="mt-1.5 text-sm font-bold text-stone-900">{formatNumber(campaign._count.donations)}명</p>
                <p className="text-[11px] text-stone-400">후원자 수</p>
              </div>
              <div className="px-2">
                <Target className="mx-auto h-4 w-4 text-brand-600" strokeWidth={1.75} />
                <p className="mt-1.5 text-sm font-bold text-stone-900">
                  {fmtKst(campaign.endDate, "M월 d일")}
                </p>
                <p className="text-[11px] text-stone-400">마감일</p>
              </div>
            </div>
          </div>

          {/* 스토리 섹션 */}
          {sections.map((s) => (
            <section key={s.title} className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-card sm:p-8">
              <h2 className="font-bold text-stone-900">{s.title}</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-stone-600">{s.body}</p>
            </section>
          ))}

          {/* 관련 이미지 */}
          {campaign.images.length > 0 && (
            <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-card sm:p-8">
              <h2 className="font-bold text-stone-900">현장 이야기</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {campaign.images.map((img: { id: string; url: string; caption: string | null }) => (
                  <figure key={img.id} className="relative">
                    <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
                      <Image src={img.url} alt={img.caption ?? ""} fill unoptimized className="object-cover" />
                    </div>
                    {img.caption && <figcaption className="mt-1 text-xs text-stone-400">{img.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </section>
          )}

          {/* 후원자에게 전하는 메시지 */}
          {campaign.messageToDonors && (
            <section className="mt-6 rounded-3xl bg-brand-700 p-6 text-white sm:p-8">
              <Quote className="h-6 w-6 text-brand-200" strokeWidth={1.5} />
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{campaign.messageToDonors}</p>
              <p className="mt-4 text-xs text-brand-200">— {campaign.organization.name} 드림</p>
            </section>
          )}
        </div>

        {/* 하단 고정 후원 CTA (모바일 sticky bar) */}
        <DonateActions
          sticky
          orgSlug={campaign.organization.slug}
          orgId={campaign.organizationId}
          orgName={campaign.organization.name}
          smsNumber={campaign.organization.smsFullNumber}
          campaignSlug={campaign.slug}
          enabledChannels={campaignChannels}
          suggestedAmounts={cfg.suggestedAmounts}
          themeColor={cfg.themeColor}
        />
      </main>
      <PublicFooter />
    </div>
  );
}
