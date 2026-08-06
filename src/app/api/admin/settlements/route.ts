import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";

/** 전체 기관 정산 목록 */
export async function GET(req: Request) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId") || undefined;
  const status = searchParams.get("status") || undefined;
  const period = searchParams.get("period") || undefined;

  try {
    const settlements = await prisma.settlement.findMany({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        ...(status ? { status: status as never } : {}),
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
