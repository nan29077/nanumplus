import { prisma } from "@/lib/prisma";
import { apiAuth, orgScope } from "@/lib/rbac";
import type { Prisma } from "@prisma/client";

/** 전체 후원 내역 (기관/채널/상태 필터, 페이지네이션) */
export async function GET(req: Request) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  const channel = url.searchParams.get("channel");
  const status = url.searchParams.get("status");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const take = 20;

  const where: Prisma.DonationWhereInput = {
    ...orgScope(auth.user, orgId),
    deletedAt: null,
    ...(channel ? { channel: channel as Prisma.DonationWhereInput["channel"] } : {}),
    ...(status ? { status: status as Prisma.DonationWhereInput["status"] } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.donation.findMany({
      where,
      orderBy: { donatedAt: "desc" },
      skip: (page - 1) * take,
      take,
      include: {
        organization: { select: { name: true } },
        donor: { select: { name: true } },
        campaign: { select: { title: true } },
      },
    }),
    prisma.donation.count({ where }),
  ]);

  return Response.json({ donations: rows, total, page, pageSize: take });
}
