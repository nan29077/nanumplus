import { apiAuth, orgScope } from "@/lib/rbac";
import { getPeriodReport, getDailySeries, getMonthlySeries, getChannelBreakdown } from "@/services/stats";
import type { PeriodKey } from "@/lib/kst-date";

/** 관리자 기간 리포트 (기관 필터 가능) */
export async function GET(req: Request) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  const period = (url.searchParams.get("period") ?? "thisMonth") as PeriodKey;
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const scope = orgScope(auth.user, orgId);

  const [report, daily, monthly, channel] = await Promise.all([
    getPeriodReport(scope, period, from && to ? { from, to } : undefined),
    getDailySeries(scope, 30),
    getMonthlySeries(scope, 12),
    getChannelBreakdown(scope, period),
  ]);

  return Response.json({ report, daily, monthly, channel });
}
