import { prisma } from "@/lib/prisma";
import { apiAuth, orgScope } from "@/lib/rbac";
import { parsePageParam, parseStatusParam } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

const VALID_CHANNELS = ["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER", "RECURRING_CARD"] as const;
const VALID_STATUSES = ["PENDING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED"] as const;

/** 전체 후원 내역 (기관/채널/상태 필터, 페이지네이션) */
export async function GET(req: Request) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  // M-3: ?page=abc / 음수 / 과대값이 그대로 skip 계산에 흘러들어 500이 나던 문제 방지.
  //      channel·status도 화이트리스트로 검증해 잘못된 enum 값으로 쿼리가 깨지지 않게 한다.
  const channel = parseStatusParam(url.searchParams.get("channel"), VALID_CHANNELS);
  const status = parseStatusParam(url.searchParams.get("status"), VALID_STATUSES);
  const page = parsePageParam(url.searchParams.get("page") ?? undefined);
  const take = 20;

  const where: Prisma.DonationWhereInput = {
    ...orgScope(auth.user, orgId),
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
