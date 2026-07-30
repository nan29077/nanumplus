import { prisma } from "@/lib/prisma";

/** 공개 기관 정보 + 모금 통계 (QR 후원 랜딩용) */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const org = await prisma.organization.findFirst({
    where: { slug: params.slug, isActive: true, deletedAt: null },
    select: {
      id: true, name: true, slug: true, logoUrl: true, description: true,
      smsFullNumber: true,
    },
  });
  if (!org) return Response.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });

  const [agg, donorCount] = await Promise.all([
    prisma.donation.aggregate({
      where: { organizationId: org.id, status: "COMPLETED", deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.donor.count({ where: { organizationId: org.id, deletedAt: null } }),
  ]);

  return Response.json({
    organization: org,
    totalAmount: agg._sum.amount ?? 0,
    donorCount,
  });
}
