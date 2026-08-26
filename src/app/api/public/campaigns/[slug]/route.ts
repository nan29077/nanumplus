import { prisma } from "@/lib/prisma";

/** 공개 캠페인 상세 */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const c = await prisma.campaign.findFirst({
    where: {
      slug: params.slug,
      isPublished: true,
      deletedAt: null,
      // 비활성·삭제된 기관의 캠페인은 공개하지 않는다
      organization: { isActive: true, deletedAt: null },
    },
    include: {
      organization: { select: { name: true, slug: true, smsFullNumber: true, logoUrl: true } },
      images: { orderBy: { sortOrder: "asc" } },
      // 후원자 수는 완료된 후원만 집계
      _count: { select: { donations: { where: { status: "COMPLETED", deletedAt: null } } } },
    },
  });
  if (!c) return Response.json({ error: "캠페인을 찾을 수 없습니다." }, { status: 404 });

  return Response.json({ campaign: c, donorCount: c._count.donations });
}
