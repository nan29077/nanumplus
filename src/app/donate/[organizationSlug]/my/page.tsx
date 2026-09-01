import { notFound } from "next/navigation";
import { UserCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { fmtKst } from "@/lib/kst-date";
import { resolveDonationPage } from "@/lib/donation-page";
import { getDonorSession } from "@/lib/donor-auth";
import { DonateShell } from "@/components/donation/donate-shell";
import { DonorScopedPanel } from "@/components/donation/donor-scoped-panel";

export const dynamic = "force-dynamic";

export default async function DonateMyPage({ params }: { params: { organizationSlug: string } }) {
  const org = await prisma.organization.findUnique({
    where: { slug: params.organizationSlug },
    include: { donationPage: true },
  });
  if (!org || !org.isActive || org.deletedAt) notFound();

  const cfg = resolveDonationPage(org.donationPage);
  const donor = await getDonorSession();
  const shellOrg = {
    name: org.name, slug: org.slug, logoUrl: cfg.logoUrl || org.logoUrl || null,
    description: org.description, address: org.address, phone: org.phone, email: org.email,
  };

  if (!donor) {
    return (
      <DonateShell org={shellOrg} themeColor={cfg.themeColor} donor={null} active="my">
        <div className="rounded-3xl border border-stone-200 bg-white px-6 py-14 text-center shadow-card">
          <UserCircle2 className="mx-auto h-10 w-10 text-stone-300" strokeWidth={1.5} />
          <p className="mt-3 font-semibold text-stone-800">로그인이 필요해요</p>
          <p className="mt-1 text-sm text-stone-500">
            우측(모바일은 상단)의 <b>로그인</b> 버튼을 눌러 카카오·네이버로 로그인하면
            후원 내역과 정기후원을 관리할 수 있어요.
          </p>
        </div>
      </DonateShell>
    );
  }

  const accId = donor.donorAccountId;
  const [account, donations, recurrings, cards, totalAgg] = await Promise.all([
    prisma.donorAccount.findUnique({ where: { id: accId }, select: { name: true, phone: true, email: true } }),
    prisma.donation.findMany({
      where: { donorAccountId: accId, deletedAt: null },
      include: { organization: { select: { name: true, slug: true } }, campaign: { select: { title: true } } },
      orderBy: { donatedAt: "desc" }, take: 100,
    }),
    prisma.recurringDonation.findMany({
      where: { donorAccountId: accId },
      include: { organization: { select: { name: true } }, billingKey: { select: { cardIssuer: true, cardLast4: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.billingKey.findMany({
      where: { donorAccountId: accId, status: "ACTIVE", deletedAt: null },
      include: { organization: { select: { name: true } } },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.donation.aggregate({ where: { donorAccountId: accId, status: "COMPLETED", deletedAt: null }, _sum: { amount: true } }),
  ]);

  const orgCount = new Set(donations.map((d) => d.organizationId).filter(Boolean)).size;
  const activeRecurring = recurrings.filter((r) => r.status === "ACTIVE").length;

  return (
    <DonateShell org={shellOrg} themeColor={cfg.themeColor} donor={{ name: donor.name, image: donor.image }} active="my">
      <DonorScopedPanel
        themeColor={cfg.themeColor}
        profile={{ name: account?.name ?? donor.name, phone: account?.phone ?? "", email: account?.email ?? donor.email }}
        summary={{ totalAmount: totalAgg._sum.amount ?? 0, orgCount, activeRecurring }}
        donations={donations.map((d) => ({
          id: d.id, amount: d.amount, channel: d.channel, status: d.status,
          donatedAt: fmtKst(d.donatedAt, "yyyy.MM.dd HH:mm"),
          orgName: d.organization?.name ?? null, orgSlug: d.organization?.slug ?? null,
          campaignTitle: d.campaign?.title ?? null,
        }))}
        recurrings={recurrings.map((r) => ({
          id: r.id, amount: r.amount, dayOfMonth: r.dayOfMonth, method: r.method, status: r.status,
          orgName: r.organization?.name ?? null, cardIssuer: r.billingKey?.cardIssuer ?? null, cardLast4: r.billingKey?.cardLast4 ?? null,
        }))}
        cards={cards.map((c) => ({ id: c.id, cardIssuer: c.cardIssuer, cardLast4: c.cardLast4, orgName: c.organization?.name ?? null }))}
      />
    </DonateShell>
  );
}
