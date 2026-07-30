import { apiAuth } from "@/lib/rbac";
import { getDashboardStats, getDailySeries, getMonthlySeries, getChannelBreakdown } from "@/services/stats";

/** 기관 대시보드 데이터 */
export async function GET() {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;
  const scope = { organizationId: auth.user.organizationId! };

  const [stats, daily, monthly, channel] = await Promise.all([
    getDashboardStats(scope),
    getDailySeries(scope, 30),
    getMonthlySeries(scope, 12),
    getChannelBreakdown(scope),
  ]);
  return Response.json({ stats, daily, monthly, channel });
}
