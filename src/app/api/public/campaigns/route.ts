import { prisma } from "@/lib/prisma";

/** 공개 캠페인 목록 (진행 중 우선) */
export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    where: { isPublished: true, deletedAt: null, status: { in: ["ACTIVE", "ENDED"] } },
    orderBy: [{ status: "asc" }, { endDate: "asc" }],
    select: {
      id: true, title: true, slug: true, coverImageUrl: true,
      goalAmount: true, currentAmount: true, endDate: true, status: true,
      organization: { select: { name: true } },
      _count: { select: { donations: true } },
    },
  });

  return Response.json({
    campaigns: campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      coverImageUrl: c.coverImageUrl,
      goalAmount: c.goalAmount,
      currentAmount: c.currentAmount,
      endDate: c.endDate,
      status: c.status,
      orgName: c.organization.name,
      donorCount: c._count.donations,
    })),
  });
}
