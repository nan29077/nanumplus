import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { parseStatusParam } from "@/lib/utils";

/** 기관 관리자: 본인 기관의 정산 목록 */
export async function GET(req: Request) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;
  const orgId = auth.user.organizationId!;

  const { searchParams } = new URL(req.url);
  const rawStatus = searchParams.get("status") || undefined;

  // status 화이트리스트 검증 — 목록에 없는 값은 400 응답
  const status = parseStatusParam(rawStatus,
    ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"] as const);
  if (rawStatus && !status) {
    return Response.json({ error: "유효하지 않은 status 값입니다." }, { status: 400 });
  }

  const settlements = await prisma.settlement.findMany({
    where: {
      organizationId: orgId,
      ...(status ? { status } : {}),
    },
    include: {
      _count: { select: { items: true } },
    },
    orderBy: { scheduledDate: "desc" },
  });

  return Response.json({ settlements });
}
