import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";

/** 기관 관리자: 본인 기관의 정산 목록 */
export async function GET(req: Request) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;
  const orgId = auth.user.organizationId!;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;

  const settlements = await prisma.settlement.findMany({
    where: {
      organizationId: orgId,
      ...(status ? { status: status as never } : {}),
    },
    include: {
      _count: { select: { items: true } },
    },
    orderBy: { scheduledDate: "desc" },
  });

  return Response.json({ settlements });
}
