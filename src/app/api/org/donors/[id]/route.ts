import { apiAuth } from "@/lib/rbac";
import { parsePageParam } from "@/lib/utils";
import { getDonorDetail } from "@/services/donor-detail";

/**
 * 후원자 상세 조회 (후원 내역·정기후원·월별 통계 포함).
 * 기관 스코프로 조회하므로 타 기관 후원자 ID는 404가 된다.
 *
 * 쿼리: dpage(후원 내역 페이지), months(월별 통계 개월 수, 1~60)
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const historyPage = parsePageParam(url.searchParams.get("dpage") ?? undefined);
  const monthsRaw = parseInt(url.searchParams.get("months") ?? "12", 10);
  const months = Number.isFinite(monthsRaw) ? Math.min(Math.max(monthsRaw, 1), 60) : 12;

  const detail = await getDonorDetail(auth.user.organizationId!, params.id, { historyPage, months });
  if (!detail) return Response.json({ error: "후원자를 찾을 수 없습니다." }, { status: 404 });

  return Response.json(detail);
}
