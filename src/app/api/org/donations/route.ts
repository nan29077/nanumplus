import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { parsePageParam, parseStatusParam } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

const VALID_CHANNELS = ["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER", "RECURRING_CARD"] as const;
const VALID_STATUSES = ["PENDING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED"] as const;

/** 기관 후원 내역 (본인 기관으로 스코프 고정) */
export async function GET(req: Request) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  // M-3: ?page=abc / 음수 / 과대값이 그대로 skip 계산에 흘러들어 500이 나던 문제 방지.
  const channel = parseStatusParam(url.searchParams.get("channel"), VALID_CHANNELS);
  const status = parseStatusParam(url.searchParams.get("status"), VALID_STATUSES);
  const page = parsePageParam(url.searchParams.get("page") ?? undefined);
  const take = 20;

  const where: Prisma.DonationWhereInput = {
    organizationId: auth.user.organizationId!,
    deletedAt: null,
    ...(channel ? { channel } : {}),
    ...(status ? { status } : {}),
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
