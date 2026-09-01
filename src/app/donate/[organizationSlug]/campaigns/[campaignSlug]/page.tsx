import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Users, Target } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatKRW, formatNumber } from "@/lib/utils";
import { fmtKst } from "@/lib/kst-date";
import { resolveDonationPage, ALL_CHANNELS, type DonationChannelKey } from "@/lib/donation-page";
import { getDonorSession } from "@/lib/donor-auth";
import { DonateShell } from "@/components/donation/donate-shell";
import { DonateActions } from "@/components/donation/donate-actions";

export const dynamic = "force-dynamic";

export default async function ScopedCampaignDetail({
  params,
}: { params: { organizationSlug: string; campaignSlug: string } }) {
  const org = await prisma.organization.findUnique({
    where: { slug: params.organizationSlug },
    include: { donationPage: true },
  });
  if (!org || !org.isActive || org.deletedAt) notFound();

  const campaign = await prisma.campaign.findFirst({
    where: { slug: params.campaignSlug, organizationId: org.id, isPublished: true, deletedAt: null },
    include: { images: { orderBy: { sortOrder: "asc" } }, _count: { select: { donations: { where: { status: "COMPLETED" } } } } },
  });
  if (!campaign) notFound();

  const cfg = resolveDonationPage(org.donationPage);
  const donor = await getDonorSession();
  const theme = cfg.themeColor;
  const pct = Math.min(100, Math.round((campaign.currentAmount / Math.max(campaign.goalAmount, 1)) * 100));
  const daysLeft = Math.max(0, Math.ceil((campaign.endDate.getTime() - Date.now()) / 86_400_000));

  let channels: DonationChannelKey[] = cfg.enabledChannels;
  if (campaign.allowedChannels) {
    try {
      const parsed = JSON.parse(campaign.allowedChannels) as unknown;
      if (Array.isArray(parsed)) {
        const set = new Set(ALL_CHANNELS as string[]);
        const picked = parsed.filter((x): x is DonationChannelKey => typeof x === "string" && set.has(x));
        if (picked.length) channels = ALL_CHANNELS.filter((c) => picked.includes(c));
      }
    } catch { /* keep default */ }
  }

  const sections = [
    { title: "상세 스토리", body: campaign.story },
    { title: "후원이 필요한 이유", body: campaign.reason },
    { title: "후원금 사용 계획", body: campaign.usagePlan },
    { title: "수혜 대상", body: campaign.beneficiary },
  ].filter((s) => s.body);

  const shellOrg = {
    name: org.name, slug: org.slug, logoUrl: cfg.logoUrl || org.logoUrl || null,
    description: org.description, address: org.address, phone: org.phone, email: org.email,
  };

  return (
    <DonateShell org={shellOrg} themeColor={theme} donor={donor ? { name: donor.name, image: donor.image } : null} active="campaigns">
      <Link href={`/donate/${org.slug}/campaigns`} className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> 캠페인 목록
      </Link>

      <div className="relative mt-3 h-48 overflow-hidden rounded-3xl sm:h-60" style={{ background: `linear-gradient(135deg, ${theme}33, ${theme}11)` }}>
        {campaign.coverImageUrl && <Image src={campaign.coverImageUrl} alt="" fill unoptimized className="object-cover" />}
      </div>

      <div className="mt-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-card">
        <h1 className="text-xl font-bold leading-snug text-stone-900">{campaign.title}</h1>
        {campaign.summary && <p className="mt-3 text-sm leading-relaxed text-stone-500">{campaign.summary}</p>}

        <div className="mt-5">
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold" style={{ color: theme }}>{pct}%</span>
            <span className="text-sm text-stone-500">목표 {formatKRW(campaign.goalAmount)}</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: theme }} />
          </div>
          <p className="mt-2 text-lg font-bold text-stone-900">{formatKRW(campaign.currentAmount)} 모금</p>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-stone-100 rounded-2xl bg-stone-50 py-4 text-center">
          <div className="px-2">
            <CalendarClock className="mx-auto h-4 w-4" strokeWidth={1.75} style={{ color: theme }} />
            <p className="mt-1.5 text-sm font-bold text-stone-900">{daysLeft > 0 ? `${daysLeft}일` : "마감"}</p>
            <p className="text-[11px] text-stone-400">남은 기간</p>
          </div>
          <div className="px-2">
            <Users className="mx-auto h-4 w-4" strokeWidth={1.75} style={{ color: theme }} />
            <p className="mt-1.5 text-sm font-bold text-stone-900">{formatNumber(campaign._count.donations)}명</p>
            <p className="text-[11px] text-stone-400">후원자</p>
          </div>
          <div className="px-2">
            <Target className="mx-auto h-4 w-4" strokeWidth={1.75} style={{ color: theme }} />
            <p className="mt-1.5 text-sm font-bold text-stone-900">{fmtKst(campaign.endDate, "M월 d일")}</p>
            <p className="text-[11px] text-stone-400">마감일</p>
          </div>
        </div>

        <div className="mt-5">
          <DonateActions
            orgSlug={org.slug} orgId={org.id} orgName={org.name} smsNumber={org.smsFullNumber} campaignSlug={campaign.slug}
            enabledChannels={channels} suggestedAmounts={cfg.suggestedAmounts} themeColor={theme}
            donor={donor ? { name: donor.name, email: donor.email } : undefined}
          />
        </div>
      </div>

      {sections.map((s) => (
        <section key={s.title} className="mt-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-card">
          <h2 className="font-bold text-stone-900">{s.title}</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-stone-600">{s.body}</p>
        </section>
      ))}

      {campaign.images.length > 0 && (
        <section className="mt-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-card">
          <h2 className="font-bold text-stone-900">현장 이야기</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {campaign.images.map((img) => (
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

      {campaign.messageToDonors && (
        <section className="mt-5 rounded-3xl p-6 text-white" style={{ backgroundColor: theme }}>
          <p className="whitespace-pre-line text-sm leading-relaxed">{campaign.messageToDonors}</p>
          <p className="mt-3 text-xs text-white/80">— {org.name} 드림</p>
        </section>
      )}
    </DonateShell>
  );
}
