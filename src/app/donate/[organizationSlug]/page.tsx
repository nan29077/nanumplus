import { notFound } from "next/navigation";
import Image from "next/image";
import { startOfMonth } from "date-fns";
import { Users, HandCoins, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatKRW, formatNumber } from "@/lib/utils";
import { kstToUtc, nowKst } from "@/lib/kst-date";
import { PublicHeader, PublicFooter } from "@/components/layout/public-layout";
import { DonateActions } from "@/components/donation/donate-actions";

export default async function DonatePage({
  params,
}: { params: { organizationSlug: string } }) {
  const org = await prisma.organization.findUnique({
    where: { slug: params.organizationSlug },
  });
  if (!org || !org.isActive || org.deletedAt) notFound();

  const monthFrom = kstToUtc(startOfMonth(nowKst()));
  const [total, month, donorCount] = await Promise.all([
    prisma.donation.aggregate({
      where: { organizationId: org.id, status: "COMPLETED", deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.donation.aggregate({
      where: { organizationId: org.id, status: "COMPLETED", deletedAt: null, donatedAt: { gte: monthFrom } },
      _sum: { amount: true },
    }),
    prisma.donor.count({ where: { organizationId: org.id, deletedAt: null } }),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1 bg-warm-50 pb-28">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-3xl border border-stone-200 bg-white p-7 text-center shadow-card">
            {org.logoUrl ? (
              <Image src={org.logoUrl} alt={`${org.name} 로고`} width={64} height={64} unoptimized className="mx-auto rounded-2xl object-cover" />
            ) : (
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-2xl font-bold text-brand-600">
                {org.name[0]}
              </span>
            )}
            <h1 className="mt-4 text-xl font-bold text-stone-900">{org.name}</h1>
            {org.description && (
              <p className="mt-2 text-sm leading-relaxed text-stone-500">{org.description}</p>
            )}

            <div className="mt-6 grid grid-cols-3 divide-x divide-stone-100 rounded-2xl bg-stone-50 py-4">
              <div className="px-2">
                <HandCoins className="mx-auto h-4 w-4 text-brand-600" strokeWidth={1.75} />
                <p className="mt-1.5 text-sm font-bold text-stone-900">{formatKRW(total._sum.amount ?? 0)}</p>
                <p className="text-[11px] text-stone-400">누적 모금액</p>
              </div>
              <div className="px-2">
                <CalendarDays className="mx-auto h-4 w-4 text-brand-600" strokeWidth={1.75} />
                <p className="mt-1.5 text-sm font-bold text-stone-900">{formatKRW(month._sum.amount ?? 0)}</p>
                <p className="text-[11px] text-stone-400">이번 달 모금액</p>
              </div>
              <div className="px-2">
                <Users className="mx-auto h-4 w-4 text-brand-600" strokeWidth={1.75} />
                <p className="mt-1.5 text-sm font-bold text-stone-900">{formatNumber(donorCount)}명</p>
                <p className="text-[11px] text-stone-400">후원 참여자</p>
              </div>
            </div>

            <p className="mt-6 rounded-2xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-800">
              여러분의 후원은 {org.name}의 이웃들에게 전달됩니다.
              아래에서 편한 후원 방법을 선택해 주세요.
            </p>
          </div>

          <DonateActions
            orgSlug={org.slug}
            orgId={org.id}
            orgName={org.name}
            smsNumber={org.smsFullNumber}
          />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
