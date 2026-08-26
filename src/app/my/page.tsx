import { prisma } from "@/lib/prisma";
import { requireDonor } from "@/lib/donor-auth";
import { PublicHeader, PublicFooter } from "@/components/layout/public-layout";
import { DonorMyClient } from "@/components/donation/donor-my-client";
import { fmtKst } from "@/lib/kst-date";

export const dynamic = "force-dynamic";

export default async function DonorMyPage() {
  const donor = await requireDonor("/my");
  const accId = donor.donorAccountId;

  const [donations, recurrings, cards, totalAgg] = await Promise.all([
    prisma.donation.findMany({
      where: { donorAccountId: accId, deletedAt: null },
      include: { organization: { select: { name: true, slug: true } }, campaign: { select: { title: true } } },
      orderBy: { donatedAt: "desc" },
      take: 100,
    }),
    prisma.recurringDonation.findMany({
      where: { donorAccountId: accId },
      include: { organization: { select: { name: true, slug: true } }, billingKey: { select: { cardIssuer: true, cardLast4: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.billingKey.findMany({
      where: { donorAccountId: accId, status: "ACTIVE", deletedAt: null },
      // billingKeyRef(공급자 토큰) 등 민감 컬럼은 조회하지 않는다
      select: {
        id: true, cardIssuer: true, cardLast4: true, issuedAt: true,
        organization: { select: { name: true } },
      },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.donation.aggregate({
      where: { donorAccountId: accId, status: "COMPLETED", deletedAt: null },
      _sum: { amount: true },
    }),
  ]);

  const orgCount = new Set(donations.map((d) => d.organizationId).filter(Boolean)).size;
  const activeRecurring = recurrings.filter((r) => r.status === "ACTIVE").length;

  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <PublicHeader />
      <main className="flex-1">
        <DonorMyClient
          donor={{ name: donor.name, email: donor.email, image: donor.image }}
          summary={{ totalAmount: totalAgg._sum.amount ?? 0, orgCount, activeRecurring }}
          donations={donations.map((d) => ({
            id: d.id,
            amount: d.amount,
            channel: d.channel,
            status: d.status,
            donatedAt: fmtKst(d.donatedAt, "yyyy.MM.dd HH:mm"),
            orgName: d.organization?.name ?? null,
            orgSlug: d.organization?.slug ?? null,
            campaignTitle: d.campaign?.title ?? null,
          }))}
          recurrings={recurrings.map((r) => ({
            id: r.id,
            amount: r.amount,
            dayOfMonth: r.dayOfMonth,
            method: r.method,
            status: r.status,
            orgName: r.organization?.name ?? null,
            orgSlug: r.organization?.slug ?? null,
            cardIssuer: r.billingKey?.cardIssuer ?? null,
            cardLast4: r.billingKey?.cardLast4 ?? null,
          }))}
          cards={cards.map((c) => ({
            id: c.id,
            cardIssuer: c.cardIssuer,
            cardLast4: c.cardLast4,
            orgName: c.organization?.name ?? null,
            issuedAt: fmtKst(c.issuedAt, "yyyy.MM.dd"),
          }))}
        />
      </main>
      <PublicFooter />
    </div>
  );
}
