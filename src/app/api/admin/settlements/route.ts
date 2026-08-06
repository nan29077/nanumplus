import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { parseStatusParam } from "@/lib/utils";

/** 전체 기관 정산 목록 */
export async function GET(req: Request) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId") || undefined;
  const rawStatus = searchParams.get("status") || undefined;
  const period = searchParams.get("period") || undefined;

  // status 화이트리스트 검증 — 목록에 없는 값은 400 응답
  const status = parseStatusParam(rawStatus,
    ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"] as const);
  if (rawStatus && !status) {
    return Response.json({ error: "유효하지 않은 status 값입니다." }, { status: 400 });
  }

  try {
    const settlements = await prisma.settlement.findMany({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        ...(status ? { status } : {}),
        ...(period ? { period } : {}),
      },
      include: {
        organization: { select: { id: true, name: true, bankName: true, bankAccount: true, bankHolder: true } },
        _count: { select: { items: true } },
      },
      orderBy: [{ scheduledDate: "desc" }, { organizationId: "asc" }],
    });

    return Response.json({ settlements });
  } catch (e) {
    console.error("[settlements] 정산 목록 조회 오류:", e);
    return Response.json({ error: "정산 목록 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
