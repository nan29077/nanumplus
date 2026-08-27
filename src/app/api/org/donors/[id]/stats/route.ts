import { apiAuth } from "@/lib/rbac";
import { getDonorMonthlyStats } from "@/services/donor-detail";

/**
 * 후원자 후원 통계 집계 (월별 금액·건수 합산 + 채널별/연도별 분포).
 * 쿼리: months (기본 12, 1~60)
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;

  const monthsRaw = parseInt(new URL(req.url).searchParams.get("months") ?? "12", 10);
  const months = Number.isFinite(monthsRaw) ? Math.min(Math.max(monthsRaw, 1), 60) : 12;

  const stats = await getDonorMonthlyStats(auth.user.organizationId!, params.id, months);
  if (!stats) return Response.json({ error: "후원자를 찾을 수 없습니다." }, { status: 404 });

  return Response.json(stats);
}
