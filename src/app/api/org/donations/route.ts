import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import type { Prisma } from "@prisma/client";

/** 기관 후원 내역 (본인 기관으로 스코프 고정) */
export async function GET(req: Request) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const channel = url.searchParams.get("channel");
  const status = url.searchParams.get("status");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const take = 20;

  const where: Prisma.DonationWhereInput = {
    organizationId: auth.user.organizationId!,
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
      include: { donor: { select: { name: true } }, campaign: { select: { title: true } } },
    }),
    prisma.donation.count({ where }),
  ]);
  return Response.json({ donations: rows, total, page, pageSize: take });
}
