import { prisma } from "@/lib/prisma";

/** 공개 캠페인 상세 */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const c = await prisma.campaign.findFirst({
    where: { slug: params.slug, isPublished: true, deletedAt: null },
    include: {
      organization: { select: { name: true, slug: true, smsFullNumber: true, logoUrl: true } },
      images: { orderBy: { sortOrder: "asc" } },
      _count: { select: { donations: true } },
    },
  });
  if (!c) return Response.json({ error: "캠페인을 찾을 수 없습니다." }, { status: 404 });

  return Response.json({ campaign: c, donorCount: c._count.donations });
}
