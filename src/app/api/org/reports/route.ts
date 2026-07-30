import { apiAuth } from "@/lib/rbac";
import { getPeriodReport, getDailySeries, getMonthlySeries, getChannelBreakdown } from "@/services/stats";
import type { PeriodKey } from "@/lib/kst-date";

export async function GET(req: Request) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;
  const scope = { organizationId: auth.user.organizationId! };

  const url = new URL(req.url);
  const period = (url.searchParams.get("period") ?? "thisMonth") as PeriodKey;
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;

  const [report, daily, monthly, channel] = await Promise.all([
    getPeriodReport(scope, period, from && to ? { from, to } : undefined),
    getDailySeries(scope, 30),
    getMonthlySeries(scope, 12),
    getChannelBreakdown(scope, period),
  ]);
  return Response.json({ report, daily, monthly, channel });
}
