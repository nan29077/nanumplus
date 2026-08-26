import { Building2, HeartHandshake } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PublicFooter, PublicHeader } from "@/components/layout/public-layout";
import { OrganizationCard } from "@/components/donation/organization-card";

export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
  const organizations = await prisma.organization.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      description: true,
      address: true,
      _count: { select: { donors: { where: { deletedAt: null } } } },
      campaigns: {
        where: { isPublished: true, deletedAt: null },
        select: { id: true },
      },
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#fbf7f0]">
      <PublicHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-[#efe3d3] bg-gradient-to-br from-[#f6ede0] via-[#fbf7f0] to-[#edf5ee]">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-20">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand-700 shadow-card">
              <HeartHandshake className="h-6 w-6" strokeWidth={1.6} />
            </span>
            <p className="mt-5 text-sm font-semibold text-[#bd7358]">나눔플러스 파트너</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">함께하는 기관</h1>
            <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-stone-500">
              우리 동네 곳곳에서 이웃의 삶을 돌보고 변화를 만드는 기관들을 소개합니다.
              마음이 닿는 기관을 찾아 이야기를 읽고 응원해 주세요.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <Building2 className="h-4 w-4 text-brand-600" />
              총 <strong className="text-stone-800">{organizations.length}</strong>개 기관
            </div>
          </div>

          {organizations.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {organizations.map((org) => (
                <OrganizationCard
                  key={org.id}
                  name={org.name}
                  slug={org.slug}
                  logoUrl={org.logoUrl}
                  description={org.description}
                  address={org.address}
                  donorCount={org._count.donors}
                  campaignCount={org.campaigns.length}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#dccbb5] bg-white px-6 py-16 text-center text-stone-500">
              아직 공개된 기관이 없습니다.
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
