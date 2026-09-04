import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { resolveDonationPage } from "@/lib/donation-page";
import { getDonorSession } from "@/lib/donor-auth";
import { maskPhone } from "@/lib/masking";
import { DonateShell } from "@/components/donation/donate-shell";
import { SmsMessagesClient } from "@/components/donation/sms-messages-client";

export const dynamic = "force-dynamic";

export default async function SmsMessagesPage({ params }: { params: { organizationSlug: string } }) {
  const org = await prisma.organization.findUnique({
    where: { slug: params.organizationSlug },
    include: { donationPage: true },
  });
  if (!org || !org.isActive || org.deletedAt) notFound();

  const cfg = resolveDonationPage(org.donationPage);
  const donor = await getDonorSession();

  const feed = await prisma.donation.findMany({
    where: { organizationId: org.id, channel: "SMS", deletedAt: null },
    orderBy: { donatedAt: "desc" },
    take: 300,
    select: { id: true, smsBody: true, senderPhone: true, donatedAt: true, amount: true, status: true },
  }).catch(() => []);

  const rows = feed.map((d) => ({
    id: d.id,
    smsBody: d.smsBody,
    // 로그인 없이 볼 수 있는 공개 페이지다. 화면에서만 마스킹하면 원문이 RSC 페이로드에
    // 그대로 실려 브라우저로 내려간다. 서버에서 마스킹한 값만 클라이언트로 넘긴다.
    senderPhone: d.senderPhone ? maskPhone(d.senderPhone) : null,
    donatedAt: d.donatedAt.toISOString(), amount: d.amount, status: d.status,
  }));

  const shellOrg = {
    name: org.name, slug: org.slug, logoUrl: cfg.logoUrl || org.logoUrl || null,
    description: org.description, address: org.address, phone: org.phone, email: org.email,
  };

  return (
    <DonateShell org={shellOrg} themeColor={cfg.themeColor} donor={donor ? { name: donor.name, image: donor.image } : null} active="home">
      <Link href={`/donate/${org.slug}`} className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> 후원 홈으로
      </Link>
      <h1 className="mt-3 text-xl font-bold text-stone-900">문자후원 내역</h1>
      <p className="mt-1 text-sm text-stone-500">{org.name}에 도착한 문자후원이에요.</p>
      <div className="mt-5">
        <SmsMessagesClient rows={rows} themeColor={cfg.themeColor} />
      </div>
    </DonateShell>
  );
}
